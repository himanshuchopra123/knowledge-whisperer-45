import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { AnswerResponse } from "@/lib/answerService";

interface AnswerDisplayProps {
  answer: AnswerResponse;
}

export const AnswerDisplay = ({ answer }: AnswerDisplayProps) => {
  return (
    <Card className="p-6 mb-6 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">AI Answer</h3>
            <Badge variant="secondary" className="text-xs">
              Based on {answer.sources.length} source{answer.sources.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{answer.question}</p>
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {answer.answer.split('\n').map((paragraph, index) => (
          paragraph.trim() && (
            <p key={index} className="mb-3 last:mb-0 text-foreground">
              {paragraph}
            </p>
          )
        ))}
      </div>
    </Card>
  );
};
