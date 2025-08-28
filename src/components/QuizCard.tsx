import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
}

interface QuizCardProps {
  question: Question;
  currentQuestion: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  showResult: boolean;
  onAnswerSelect: (index: number) => void;
  onNext: () => void;
}

export function QuizCard({
  question,
  currentQuestion,
  totalQuestions,
  selectedAnswer,
  showResult,
  onAnswerSelect,
  onNext,
}: QuizCardProps) {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-glow animate-fade-in">
      <CardContent className="p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {totalQuestions}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const isIncorrect = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => !showResult && onAnswerSelect(index)}
                  disabled={showResult}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all duration-300 text-left",
                    "hover:border-primary/50 hover:bg-secondary/50",
                    {
                      "border-primary bg-primary/10": isSelected && !showResult,
                      "border-success bg-success/20 text-success-foreground": showResult && isCorrect,
                      "border-destructive bg-destructive/20 text-destructive-foreground": isIncorrect,
                      "border-border": !isSelected && !showResult,
                      "cursor-not-allowed": showResult,
                    }
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {showResult && (
                      <>
                        {isCorrect && (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                        {isIncorrect && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {showResult && (
          <div className="text-center animate-slide-up">
            <Button 
              onClick={onNext} 
              size="lg"
              className="bg-gradient-primary hover:opacity-90 shadow-glow px-8"
            >
              {currentQuestion + 1 === totalQuestions ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}