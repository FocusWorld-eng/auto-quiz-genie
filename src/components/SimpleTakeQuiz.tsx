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
import { ArrowLeft, Send } from 'lucide-react';

interface Question {
  id: string;
  type: 'mcq' | 'short';
  difficulty: string;
  question_text: string;
  choices?: { label: string; text: string; is_correct: boolean }[];
  model_answer?: string;
  weight: number;
}

interface Quiz {
  id: string;
  title: string;
  meta: {
    description?: string;
    topic?: string;
    total_questions?: number;
  };
}

interface SimpleTakeQuizProps {
  quiz: Quiz;
  onComplete: (submissionId: string) => void;
  onBack: () => void;
}

export function SimpleTakeQuiz({ quiz, onComplete, onBack }: SimpleTakeQuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { questionId: string; answerText?: string; choiceLabel?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, [quiz.id]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('created_at');

      if (error) {
        throw error;
      }

      // Extract question data from JSONB
      const processedQuestions = (data || []).map(item => item.q as unknown as Question);
      setQuestions(processedQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz questions.",
        variant: "destructive",
      });
    }
  };

  const handleAnswerChange = (questionId: string, answerText?: string, choiceLabel?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answerText, choiceLabel }
    }));
  };

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];

    if (!answer || (!answer.answerText && !answer.choiceLabel)) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      // Create submission with answers
      const answersArray = Object.values(answers);
      
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          quiz_id: quiz.id,
          user_id: user.id,
          answers: answersArray
        })
        .select()
        .single();

      if (submissionError) {
        throw submissionError;
      }

      // Grade the submission
      const { data: gradingResult, error: gradingError } = await supabase.functions.invoke('grade', {
        body: { submissionId: submission.id }
      });

      if (gradingError) {
        throw gradingError;
      }

      toast({
        title: "Quiz Submitted!",
        description: "Your answers have been submitted and graded.",
      });

      onComplete(submission.id);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-glow">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <p className="text-muted-foreground">{quiz.meta?.description}</p>
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
                {currentQuestion?.weight} point{currentQuestion?.weight !== 1 ? 's' : ''}
              </p>
            </div>

            {currentQuestion?.type === 'mcq' ? (
              <div className="space-y-3 mb-8">
                <RadioGroup
                  value={answer?.choiceLabel || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, undefined, value)}
                >
                  {currentQuestion.choices?.map((choice) => (
                    <div
                      key={choice.label}
                      className="p-4 rounded-lg border-2 transition-all duration-300 hover:border-primary/50"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={choice.label} id={`choice-${choice.label}`} />
                        <Label htmlFor={`choice-${choice.label}`} className="font-medium cursor-pointer">
                          {choice.label}. {choice.text}
                        </Label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                <Textarea
                  placeholder="Type your answer here..."
                  value={answer?.answerText || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="min-h-32"
                  disabled={submitting}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={onBack} disabled={submitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={submitting || !answer || (!answer.answerText && !answer.choiceLabel)}
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