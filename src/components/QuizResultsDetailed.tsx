import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizSubmission {
  id: string;
  total_score: number;
  max_possible_score: number;
  is_completed: boolean;
  needs_review: boolean;
  submitted_at: string;
  quiz: {
    title: string;
    description: string;
    topic: string;
  };
}

interface QuestionResponse {
  id: string;
  student_answer: string;
  is_correct: boolean;
  points_earned: number;
  ai_feedback?: string;
  confidence?: 'high' | 'medium' | 'low';
  requires_manual_review: boolean;
  question: {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'short_answer';
    options?: string[];
    correct_answer_index?: number;
    sample_answer?: string;
    points: number;
  };
}

interface QuizResultsDetailedProps {
  submissionId: string;
  onBack: () => void;
}

export function QuizResultsDetailed({ submissionId, onBack }: QuizResultsDetailedProps) {
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      // Fetch submission details
      const { data: submissionData, error: submissionError } = await supabase
        .from('quiz_submissions')
        .select(`
          *,
          quizzes (
            title,
            description,
            topic
          )
        `)
        .eq('id', submissionId)
        .single();

      if (submissionError) {
        toast({
          title: "Error",
          description: "Failed to load quiz results.",
          variant: "destructive",
        });
        return;
      }

      // Fetch question responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('question_responses')
        .select(`
          *,
          questions (
            id,
            question_text,
            question_type,
            options,
            correct_answer_index,
            sample_answer,
            points
          )
        `)
        .eq('submission_id', submissionId);

      if (responsesError) {
        toast({
          title: "Error",
          description: "Failed to load response details.",
          variant: "destructive",
        });
        return;
      }

      setSubmission({
        ...submissionData,
        quiz: submissionData.quizzes
      });
      setResponses((responsesData || []).map(r => ({ ...r, question: r.questions })));
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz results.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-auto shadow-glow">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-auto shadow-glow">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Quiz results not found.</p>
            <Button className="mt-4" onClick={onBack}>
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentage = Math.round((submission.total_score / submission.max_possible_score) * 100);
  
  const getScoreMessage = () => {
    if (percentage >= 90) return "Excellent work! 🎉";
    if (percentage >= 70) return "Great job! 👏";
    if (percentage >= 50) return "Good effort! 👍";
    return "Keep practicing! 💪";
  };

  const getScoreColor = () => {
    if (percentage >= 70) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
              <div className="text-sm text-muted-foreground">
                Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Results Summary */}
        <Card className="shadow-glow animate-fade-in">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-gradient-primary">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{submission.quiz.title}</CardTitle>
            <p className="text-muted-foreground">{submission.quiz.description}</p>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-pulse-glow">
                {percentage}%
              </div>
              
              <div className="text-xl font-semibold text-muted-foreground">
                {getScoreMessage()}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-lg">
                <span className="text-muted-foreground">Score:</span>
                <span className={cn("font-bold", getScoreColor())}>
                  {submission.total_score} / {submission.max_possible_score} points
                </span>
              </div>

              {submission.needs_review && (
                <div className="flex items-center justify-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Some answers are under review</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Breakdown */}
        <Card className="shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Question Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {responses.map((response, index) => (
              <Card key={response.id} className="border">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">
                        Question {index + 1}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={response.is_correct ? "default" : "destructive"}>
                          {response.points_earned} / {response.question.points} pts
                        </Badge>
                        {response.question.question_type === 'multiple_choice' ? (
                          response.is_correct ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )
                        ) : response.confidence && (
                          <Badge variant={
                            response.confidence === 'high' ? 'default' :
                            response.confidence === 'medium' ? 'secondary' : 'outline'
                          }>
                            {response.confidence} confidence
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-foreground font-medium">
                      {response.question.question_text}
                    </p>

                    {response.question.question_type === 'multiple_choice' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Your answer:</p>
                        <div className="grid gap-2">
                          {response.question.options?.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={cn(
                                "p-3 rounded border text-sm",
                                {
                                  "bg-success/20 border-success": optionIndex === response.question.correct_answer_index,
                                  "bg-destructive/20 border-destructive": 
                                    parseInt(response.student_answer) === optionIndex && 
                                    optionIndex !== response.question.correct_answer_index,
                                  "bg-muted": 
                                    optionIndex !== response.question.correct_answer_index && 
                                    parseInt(response.student_answer) !== optionIndex
                                }
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                {optionIndex === response.question.correct_answer_index && (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                )}
                                {parseInt(response.student_answer) === optionIndex && 
                                 optionIndex !== response.question.correct_answer_index && (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Your answer:</p>
                          <div className="p-3 bg-muted rounded border">
                            {response.student_answer || 'No answer provided'}
                          </div>
                        </div>
                        
                        {response.ai_feedback && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">AI Feedback:</p>
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                              {response.ai_feedback}
                            </div>
                          </div>
                        )}

                        {response.requires_manual_review && (
                          <div className="flex items-center gap-2 text-warning text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This answer is pending teacher review</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}