import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';

interface SimpleQuizGeneratorProps {
  onQuizGenerated: () => void;
}

export function SimpleQuizGenerator({ onQuizGenerated }: SimpleQuizGeneratorProps) {
  const [topicText, setTopicText] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topicText.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for the quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topicText: topicText.trim(), numQuestions }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Quiz Generated!",
          description: data.message || "Quiz created successfully.",
        });
        setTopicText('');
        setNumQuestions(5);
        onQuizGenerated();
      } else {
        throw new Error(data?.error || 'Failed to generate quiz');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate New Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="topic">Topic or Content</Label>
          <Textarea
            id="topic"
            placeholder="Enter the topic, lesson content, or subject matter for the quiz..."
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            className="min-h-24"
          />
        </div>
        
        <div>
          <Label htmlFor="numQuestions">Number of Questions</Label>
          <Input
            id="numQuestions"
            type="number"
            min="1"
            max="20"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topicText.trim()}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Quiz
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}