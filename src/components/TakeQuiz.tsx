import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  options?: string[];
  correct_answer_index?: number;
  points: number;
  order_number: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  total_questions: number;
  time_limit: number;
}

interface TakeQuizProps {
  quiz: Quiz;
  onComplete: (submissionId: string) => void;
  onBack: () => void;
}

export function TakeQuiz({ quiz, onComplete, onBack }: TakeQuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60); // Convert to seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestionsAndCreateSubmission();
  }, [quiz.id, user?.id]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !submitting) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, submitting]);

  const fetchQuestionsAndCreateSubmission = async () => {
    if (!user) return;

    try {
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_number');

      if (questionsError) {
        toast({
          title: "Error",
          description: "Failed to load quiz questions.",
          variant: "destructive",
        });
        return;
      }

      // Check if submission already exists
      const { data: existingSubmission } = await supabase
        .from('quiz_submissions')
        .select('id, is_completed')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id)
        .single();

      if (existingSubmission?.is_completed) {
        toast({
          title: "Quiz Already Completed",
          description: "You have already completed this quiz.",
          variant: "destructive",
        });
        onBack();
        return;
      }

      let currentSubmissionId = existingSubmission?.id;

      // Create new submission if none exists
      if (!currentSubmissionId) {
        const { data: newSubmission, error: submissionError } = await supabase
          .from('quiz_submissions')
          .insert({
            quiz_id: quiz.id,
            student_id: user.id,
            max_possible_score: questionsData?.reduce((sum, q) => sum + q.points, 0) || 0
          })
          .select('id')
          .single();

        if (submissionError) {
          toast({
            title: "Error",
            description: "Failed to start quiz.",
            variant: "destructive",
          });
          return;
        }

        currentSubmissionId = newSubmission.id;
      }

      setQuestions((questionsData || []).map(q => ({ 
        ...q, 
        options: Array.isArray(q.options) ? q.options as string[] : []
      })));
      setSubmissionId(currentSubmissionId);
      setLoading(false);
    } catch (error) {
      console.error('Error setting up quiz:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz.",
        variant: "destructive",
      });
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];

    if (!answer && answer !== "0") {
      toast({
        title: "Answer Required",
        description: "Please select or provide an answer before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Show result for MCQ questions
    if (currentQuestion.question_type === 'multiple_choice') {
      setShowResult(prev => ({ ...prev, [currentQuestion.id]: true }));
      
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setShowResult(prev => ({ ...prev, [currentQuestion.id]: false }));
        } else {
          handleSubmit();
        }
      }, 2000);
    } else {
      // For short answer, move directly to next question or submit
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    if (!submissionId) return;

    setSubmitting(true);

    try {
      // Save all responses
      const responses = questions.map(question => ({
        submission_id: submissionId,
        question_id: question.id,
        student_answer: answers[question.id] || ''
      }));

      const { error: responsesError } = await supabase
        .from('question_responses')
        .upsert(responses);

      if (responsesError) {
        throw responsesError;
      }

      // Grade the submission
      const { data: gradingResult, error: gradingError } = await supabase.functions.invoke('grade', {
        body: { submissionId }
      });

      if (gradingError) {
        throw gradingError;
      }

      toast({
        title: "Quiz Submitted!",
        description: "Your answers have been submitted and graded.",
      });

      onComplete(submissionId);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-auto shadow-glow">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading quiz...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answer = answers[currentQuestion?.id];
  const showingResult = showResult[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-glow">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <p className="text-muted-foreground">{quiz.description}</p>
              </div>
              <div className="flex items-center gap-2 text-lg font-mono">
                <Clock className="h-5 w-5" />
                <span className={cn(
                  "font-bold",
                  timeLeft < 300 ? "text-destructive" : "text-foreground"
                )}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium text-primary">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Question */}
        <Card className="shadow-glow animate-fade-in">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentQuestion?.question_text}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentQuestion?.points} point{currentQuestion?.points !== 1 ? 's' : ''}
              </p>
            </div>

            {currentQuestion?.question_type === 'multiple_choice' ? (
              <div className="space-y-3 mb-8">
                <RadioGroup
                  value={answer}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  disabled={showingResult}
                >
                  {currentQuestion.options?.map((option, index) => {
                    const isSelected = answer === index.toString();
                    const isCorrect = index === currentQuestion.correct_answer_index;
                    const isIncorrect = showingResult && isSelected && !isCorrect;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all duration-300",
                          "hover:border-primary/50",
                          {
                            "border-primary bg-primary/10": isSelected && !showingResult,
                            "border-success bg-success/20": showingResult && isCorrect,
                            "border-destructive bg-destructive/20": isIncorrect,
                            "border-border": !isSelected && !showingResult,
                          }
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="font-medium cursor-pointer">
                              {option}
                            </Label>
                          </div>
                          {showingResult && (
                            <>
                              {isCorrect && <CheckCircle className="h-5 w-5 text-success" />}
                              {isIncorrect && <XCircle className="h-5 w-5 text-destructive" />}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                <Textarea
                  placeholder="Type your answer here..."
                  value={answer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="min-h-32"
                  disabled={submitting}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={onBack} disabled={submitting}>
                Back to Quizzes
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={submitting || (!answer && answer !== "0")}
                className="bg-gradient-primary hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : currentQuestionIndex === questions.length - 1 ? (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Quiz
                  </>
                ) : showingResult ? (
                  "Loading..."
                ) : (
                  "Next Question"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}