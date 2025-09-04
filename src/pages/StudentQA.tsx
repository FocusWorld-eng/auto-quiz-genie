import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, BookOpen, HelpCircle, LogOut } from "lucide-react";
import studyFocusBg from "@/assets/study-focus-bg.png";

const SCIENCE_SUBJECTS = [
  { value: "physics", label: "Physics", icon: "⚛️" },
  { value: "chemistry", label: "Chemistry", icon: "🧪" },
  { value: "biology", label: "Biology", icon: "🧬" },
  { value: "mathematics", label: "Mathematics", icon: "📐" },
  { value: "computer-science", label: "Computer Science", icon: "💻" },
  { value: "earth-science", label: "Earth Science", icon: "🌍" },
  { value: "astronomy", label: "Astronomy", icon: "🔭" },
  { value: "environmental-science", label: "Environmental Science", icon: "🌱" },
];

const StudentQA = () => {
  const [question, setQuestion] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmitQuestion = async () => {
    if (!question.trim() || !selectedSubject) {
      toast({
        title: "Missing Information",
        description: "Please enter a question and select a subject.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setAnswer("");

    try {
      const { data, error } = await supabase.functions.invoke('student-qa', {
        body: {
          question: question.trim(),
          subject: selectedSubject
        }
      });

      if (error) throw error;

      setAnswer(data.answer);
      toast({
        title: "Answer Generated",
        description: "Your tutor has provided an answer to your question."
      });
    } catch (error) {
      console.error('Error getting answer:', error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${studyFocusBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/60 to-secondary/20" />
      
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Ask Your Tutor
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile.full_name || 'Student'}
              </span>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-gradient-primary">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold">Get Help with Your Studies</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ask questions about any science subject and get detailed explanations from your AI tutor. 
                Perfect for homework help, concept clarification, and exam preparation.
              </p>
            </div>

            {/* Question Form */}
            <Card className="shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Ask a Question
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a science subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SCIENCE_SUBJECTS.map((subject) => (
                        <SelectItem key={subject.value} value={subject.value}>
                          <div className="flex items-center gap-2">
                            <span>{subject.icon}</span>
                            {subject.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Question</label>
                  <Textarea
                    placeholder="Type your question here... For example: 'Can you explain Newton's second law of motion?' or 'How do I balance this chemical equation: H₂ + O₂ → H₂O?'"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleSubmitQuestion}
                  disabled={isLoading || !question.trim() || !selectedSubject}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  {isLoading ? 'Getting Answer...' : 'Ask Tutor'}
                </Button>
              </CardContent>
            </Card>

            {/* Answer Display */}
            {answer && (
              <Card className="shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Tutor's Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {answer}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Example Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Example Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Physics</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• What is the difference between velocity and acceleration?</li>
                      <li>• How do I solve projectile motion problems?</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Chemistry</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• How do I balance chemical equations?</li>
                      <li>• What are the different types of chemical bonds?</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Biology</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Can you explain photosynthesis step by step?</li>
                      <li>• What's the difference between mitosis and meiosis?</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Mathematics</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• How do I solve quadratic equations?</li>
                      <li>• What are derivatives and how do I calculate them?</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQA;