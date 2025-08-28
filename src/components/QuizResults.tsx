import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
}

export function QuizResults({ score, totalQuestions, onRestart }: QuizResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  
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
    <Card className="w-full max-w-2xl mx-auto shadow-glow animate-fade-in">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gradient-primary">
            <Trophy className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Quiz Complete!</CardTitle>
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
            <Target className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">You scored</span>
            <span className={cn("font-bold", getScoreColor())}>
              {score} out of {totalQuestions}
            </span>
            <span className="text-muted-foreground">questions correctly</span>
          </div>
        </div>

        <div className="pt-6">
          <Button 
            onClick={onRestart}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 shadow-glow px-8"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Take Quiz Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}