import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wand2, Loader2 } from 'lucide-react';

interface QuizGeneratorProps {
  onQuizGenerated: () => void;
}

export function QuizGenerator({ onQuizGenerated }: QuizGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    lessonText: '',
    mcqCount: 5,
    shortAnswerCount: 3,
    timeLimit: 30
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim() || !formData.lessonText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both topic and lesson content.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          topic: formData.topic,
          lessonText: formData.lessonText,
          mcqCount: formData.mcqCount,
          shortAnswerCount: formData.shortAnswerCount,
          title: formData.title,
          description: formData.description,
          timeLimit: formData.timeLimit
        }
      });

      if (error) {
        console.error('Quiz generation error:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate quiz. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Quiz Generated!",
          description: "Your quiz has been created successfully.",
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          topic: '',
          lessonText: '',
          mcqCount: 5,
          shortAnswerCount: 3,
          timeLimit: 30
        });
        
        onQuizGenerated();
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate quiz. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast({
        title: "Generation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Generate New Quiz
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title (Optional)</Label>
              <Input
                id="title"
                placeholder="AI will generate if empty"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="5"
                max="180"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="AI will generate if empty"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic *</Label>
            <Input
              id="topic"
              placeholder="e.g., World War II, Photosynthesis, Machine Learning"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonText">Lesson Content *</Label>
            <Textarea
              id="lessonText"
              placeholder="Paste your lesson text, article, or study material here..."
              className="min-h-32"
              value={formData.lessonText}
              onChange={(e) => setFormData({ ...formData, lessonText: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mcqCount">Multiple Choice Questions</Label>
              <Input
                id="mcqCount"
                type="number"
                min="1"
                max="20"
                value={formData.mcqCount}
                onChange={(e) => setFormData({ ...formData, mcqCount: parseInt(e.target.value) || 5 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shortAnswerCount">Short Answer Questions</Label>
              <Input
                id="shortAnswerCount"
                type="number"
                min="0"
                max="10"
                value={formData.shortAnswerCount}
                onChange={(e) => setFormData({ ...formData, shortAnswerCount: parseInt(e.target.value) || 3 })}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Quiz
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}