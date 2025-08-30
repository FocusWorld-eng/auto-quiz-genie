import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Play, RotateCcw } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  meta: {
    description?: string;
    topic?: string;
    total_questions?: number;
  };
  created_at: string;
}

interface SimpleQuizListProps {
  onTakeQuiz: (quiz: Quiz) => void;
  refreshTrigger: number;
}

export function SimpleQuizList({ onTakeQuiz, refreshTrigger }: SimpleQuizListProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizzes();
  }, [refreshTrigger]);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setQuizzes((data || []).map(item => ({
        ...item,
        meta: typeof item.meta === 'object' && item.meta ? item.meta as any : {}
      })));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to load quizzes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-glow">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quizzes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Available Quizzes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchQuizzes}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No quizzes available yet.</p>
            <p className="text-sm text-muted-foreground">Generate your first quiz to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                  {quiz.meta?.description && (
                    <p className="text-sm text-muted-foreground">{quiz.meta.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {quiz.meta?.topic && (
                      <Badge variant="secondary">{quiz.meta.topic}</Badge>
                    )}
                    {quiz.meta?.total_questions && (
                      <Badge variant="outline">{quiz.meta.total_questions} questions</Badge>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => onTakeQuiz(quiz)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Take Quiz
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}