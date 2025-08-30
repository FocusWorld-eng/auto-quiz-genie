import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradedResult {
  id: string;
  score: number;
  max: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

interface Submission {
  id: string;
  score: number;
  graded: GradedResult[];
  quiz_id: string;
  created_at: string;
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

interface Question {
  id: string;
  type: 'mcq' | 'short';
  question_text: string;
  choices?: { label: string; text: string; is_correct: boolean }[];
  model_answer?: string;
  weight: number;
}

interface SimpleQuizResultsProps {
  submissionId: string;
  onBack: () => void;
}

export function SimpleQuizResults({ submissionId, onBack }: SimpleQuizResultsProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      // Fetch submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) {
        throw submissionError;
      }

      setSubmission({
        ...submissionData,
        graded: Array.isArray(submissionData.graded) ? submissionData.graded as any : []
      });

      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', submissionData.quiz_id)
        .single();

      if (quizError) {
        throw quizError;
      }

      setQuiz({
        ...quizData,
        meta: typeof quizData.meta === 'object' && quizData.meta ? quizData.meta as any : {}
      });

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', submissionData.quiz_id);

      if (questionsError) {
        throw questionsError;
      }

      const processedQuestions = (questionsData || []).map(item => item.q as unknown as Question);
      setQuestions(processedQuestions);

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

  if (!submission || !quiz) {
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

  const maxPossibleScore = questions.reduce((sum, q) => sum + q.weight, 0);
  const percentage = Math.round((submission.score / maxPossibleScore) * 100);
  
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
                Submitted: {new Date(submission.created_at).toLocaleDateString()}
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
            <CardTitle className="text-2xl font-bold">{quiz.title}</CardTitle>
            <p className="text-muted-foreground">{quiz.meta?.description}</p>
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
                  {submission.score} / {maxPossibleScore} points
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Breakdown */}
        <Card className="shadow-glow">
          <CardHeader>
            <CardTitle>Question Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.graded?.map((result, index) => {
              const question = questions.find(q => q.id === result.id);
              if (!question) return null;

              return (
                <Card key={result.id} className="border">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">
                          Question {index + 1}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.score === result.max ? "default" : "destructive"}>
                            {result.score} / {result.max} pts
                          </Badge>
                          {question.type === 'mcq' ? (
                            result.score === result.max ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )
                          ) : (
                            <Badge variant={
                              result.confidence === 'high' ? 'default' :
                              result.confidence === 'medium' ? 'secondary' : 'outline'
                            }>
                              {result.confidence} confidence
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-foreground font-medium">
                        {question.question_text}
                      </p>

                      <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                        <p className="text-sm text-muted-foreground mb-2">Feedback:</p>
                        <p className="text-sm">{result.explanation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}