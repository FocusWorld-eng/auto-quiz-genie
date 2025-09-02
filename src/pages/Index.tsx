import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleQuizGenerator } from "@/components/SimpleQuizGenerator";
import { SimpleQuizList } from "@/components/SimpleQuizList";
import { SimpleTakeQuiz } from "@/components/SimpleTakeQuiz";
import { SimpleQuizResults } from "@/components/SimpleQuizResults";
import { useAuth } from "@/hooks/useAuth";
import { Play, Brain, Zap, Target, LogIn, UserCheck, GraduationCap, LogOut } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { useNavigate } from "react-router-dom";

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

const Index = () => {
  const [currentView, setCurrentView] = useState<"dashboard" | "taking-quiz" | "results">("dashboard");
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Study with Focus
            </h1>
            <Button onClick={() => navigate('/auth')} className="bg-gradient-primary hover:opacity-90">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
              <div className="space-y-4 animate-fade-in">
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  Study with Focus
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                  Generate teacher-ready quizzes from any lesson content and auto-grade student submissions with AI
                </p>
              </div>
              
              <div className="relative">
                <img 
                  src={heroImage} 
                  alt="Interactive quiz interface with colorful elements" 
                  className="rounded-2xl shadow-glow mx-auto max-w-3xl w-full animate-slide-up"
                />
                <div className="absolute inset-0 bg-gradient-primary/20 rounded-2xl"></div>
              </div>

              <div className="animate-slide-up space-y-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8 py-6 h-auto"
                  onClick={() => navigate('/auth')}
                >
                  <Play className="mr-2 h-6 w-6" />
                  Get Started
                </Button>
                <p className="text-sm text-muted-foreground">
                  Join as a teacher to create quizzes or as a student to take them
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">AI Quiz Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate comprehensive quizzes from any lesson text with MCQ and short answer questions
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Smart Auto-Grading</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI grades short answers with confidence scoring and flags items for teacher review
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Teacher Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Complete quiz management system with student tracking and detailed analytics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle quiz results view
  if (currentView === "results" && submissionId) {
    return (
      <SimpleQuizResults
        submissionId={submissionId}
        onBack={() => {
          setCurrentView("dashboard");
          setSubmissionId(null);
        }}
      />
    );
  }

  // Handle taking quiz view
  if (currentView === "taking-quiz" && selectedQuiz) {
    return (
      <SimpleTakeQuiz
        quiz={selectedQuiz}
        onComplete={(id) => {
          setSubmissionId(id);
          setCurrentView("results");
        }}
        onBack={() => {
          setCurrentView("dashboard");
          setSelectedQuiz(null);
        }}
      />
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Study with Focus
            </h1>
            <div className="flex items-center gap-2">
              {profile.role === 'teacher' ? (
                <UserCheck className="h-5 w-5 text-primary" />
              ) : (
                <GraduationCap className="h-5 w-5 text-primary" />
              )}
              <span className="text-sm text-muted-foreground capitalize">
                {profile.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile.full_name || 'User'}
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Teacher Quiz Generator */}
        {profile.role === 'teacher' && (
          <SimpleQuizGenerator
            onQuizGenerated={() => setRefreshTrigger(prev => prev + 1)}
          />
        )}

        {/* Quiz List */}
        <SimpleQuizList
          refreshTrigger={refreshTrigger}
          onTakeQuiz={(quiz) => {
            setSelectedQuiz(quiz);
            setCurrentView("taking-quiz");
          }}
        />
      </div>
    </div>
  );
};

export default Index;