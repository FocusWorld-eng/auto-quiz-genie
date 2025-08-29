import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Play, Edit, Eye, Users, Clock, FileText } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  total_questions: number;
  mcq_count: number;
  short_answer_count: number;
  time_limit: number;
  is_published: boolean;
  created_at: string;
}

interface QuizListProps {
  refreshTrigger: number;
  onTakeQuiz: (quiz: Quiz) => void;
  onEditQuiz?: (quiz: Quiz) => void;
}

export function QuizList({ refreshTrigger, onTakeQuiz, onEditQuiz }: QuizListProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchQuizzes = async () => {
    try {
      let query = supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      
      // Students only see published quizzes, teachers see their own quizzes
      if (profile?.role === 'student') {
        query = query.eq('is_published', true);
      } else if (profile?.role === 'teacher') {
        query = query.eq('created_by', profile.user_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quizzes:', error);
        toast({
          title: "Error",
          description: "Failed to load quizzes.",
          variant: "destructive",
        });
        return;
      }

      setQuizzes(data || []);
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

  useEffect(() => {
    if (profile) {
      fetchQuizzes();
    }
  }, [profile, refreshTrigger]);

  const handlePublishToggle = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !quiz.is_published })
        .eq('id', quiz.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update quiz status.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Quiz ${quiz.is_published ? 'unpublished' : 'published'} successfully.`,
      });

      fetchQuizzes();
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz status.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading quizzes...</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Quizzes Available</h3>
          <p className="text-muted-foreground">
            {profile?.role === 'teacher' 
              ? "Create your first quiz using the generator above."
              : "No published quizzes are available yet. Check back later!"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        {profile?.role === 'teacher' ? 'My Quizzes' : 'Available Quizzes'}
      </h2>
      
      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{quiz.title}</CardTitle>
                  <p className="text-muted-foreground">{quiz.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{quiz.topic}</Badge>
                    {profile?.role === 'teacher' && (
                      <Badge variant={quiz.is_published ? "default" : "outline"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{quiz.total_questions} questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{quiz.time_limit} min</span>
                  </div>
                  <div className="text-xs">
                    MCQ: {quiz.mcq_count} | Short: {quiz.short_answer_count}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {profile?.role === 'student' && (
                    <Button 
                      onClick={() => onTakeQuiz(quiz)}
                      className="bg-gradient-primary hover:opacity-90"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Take Quiz
                    </Button>
                  )}
                  
                  {profile?.role === 'teacher' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handlePublishToggle(quiz)}
                      >
                        {quiz.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => onEditQuiz?.(quiz)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}