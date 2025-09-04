import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';

const SCIENCE_TOPICS = [
  { value: "physics", label: "Physics", icon: "⚛️", description: "Mechanics, thermodynamics, electromagnetism, optics, and modern physics" },
  { value: "chemistry", label: "Chemistry", icon: "🧪", description: "Organic, inorganic, physical chemistry, and biochemistry" },
  { value: "biology", label: "Biology", icon: "🧬", description: "Cell biology, genetics, ecology, anatomy, and physiology" },
  { value: "mathematics", label: "Mathematics", icon: "📐", description: "Algebra, calculus, geometry, statistics, and discrete mathematics" },
  { value: "computer-science", label: "Computer Science", icon: "💻", description: "Programming, algorithms, data structures, and software engineering" },
  { value: "earth-science", label: "Earth Science", icon: "🌍", description: "Geology, meteorology, oceanography, and environmental science" },
  { value: "astronomy", label: "Astronomy", icon: "🔭", description: "Solar system, stars, galaxies, and cosmology" },
];

interface SimpleQuizGeneratorProps {
  onQuizGenerated: () => void;
}

export function SimpleQuizGenerator({ onQuizGenerated }: SimpleQuizGeneratorProps) {
  const [topicText, setTopicText] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topicText.trim() || !selectedCourse) {
      toast({
        title: "Missing Information",
        description: "Please enter topic content and select a science course.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { 
          topicText: topicText.trim(), 
          course: selectedCourse,
          difficulty: difficulty,
          numQuestions 
        }
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
        setSelectedCourse('');
        setDifficulty('intermediate');
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
          Generate Science Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Science Course</Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select a science course..." />
            </SelectTrigger>
            <SelectContent>
              {SCIENCE_TOPICS.map((topic) => (
                <SelectItem key={topic.value} value={topic.value}>
                  <div className="flex items-center gap-2">
                    <span>{topic.icon}</span>
                    <div>
                      <div className="font-medium">{topic.label}</div>
                      <div className="text-xs text-muted-foreground">{topic.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Difficulty Level</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner - High school level</SelectItem>
              <SelectItem value="intermediate">Intermediate - Early undergraduate</SelectItem>
              <SelectItem value="advanced">Advanced - Upper undergraduate/graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="topic">Topic or Lesson Content</Label>
          <Textarea
            id="topic"
            placeholder="Enter the specific topic, lesson content, or subject matter for the quiz..."
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
          disabled={isGenerating || !topicText.trim() || !selectedCourse}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Science Quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Science Quiz
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}