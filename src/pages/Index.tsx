import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizCard } from "@/components/QuizCard";
import { QuizResults } from "@/components/QuizResults";
import { Play, Brain, Zap, Target } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correct: 2,
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1,
  },
  {
    id: 3,
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    correct: 1,
  },
  {
    id: 4,
    question: "In what year did World War II end?",
    options: ["1944", "1945", "1946", "1947"],
    correct: 1,
  },
  {
    id: 5,
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correct: 2,
  },
];

const Index = () => {
  const [gameState, setGameState] = useState<"start" | "playing" | "results">("start");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const startQuiz = () => {
    setGameState("playing");
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setUserAnswers([]);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setTimeout(() => {
      setShowResult(true);
    }, 100);
  };

  const handleNext = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...userAnswers, selectedAnswer];
      setUserAnswers(newAnswers);
      
      if (selectedAnswer === sampleQuestions[currentQuestion].correct) {
        setScore(score + 1);
      }
    }

    if (currentQuestion + 1 >= sampleQuestions.length) {
      setGameState("results");
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  if (gameState === "results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <QuizResults 
          score={score} 
          totalQuestions={sampleQuestions.length} 
          onRestart={startQuiz}
        />
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <QuizCard
          question={sampleQuestions[currentQuestion]}
          currentQuestion={currentQuestion}
          totalQuestions={sampleQuestions.length}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
          onAnswerSelect={handleAnswerSelect}
          onNext={handleNext}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                AutoQuiz
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Test your knowledge with interactive quizzes powered by intelligent question generation
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

            <div className="animate-slide-up">
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8 py-6 h-auto"
                onClick={startQuiz}
              >
                <Play className="mr-2 h-6 w-6" />
                Start Quiz Now
              </Button>
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
              <CardTitle className="text-xl">Smart Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                AI-powered question generation ensures diverse and challenging content
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Instant Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get immediate results and explanations to learn from every question
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monitor your performance and identify areas for improvement
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;