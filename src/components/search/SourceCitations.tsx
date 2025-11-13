import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar } from "lucide-react";
import type { AnswerSource } from "@/lib/answerService";

interface SourceCitationsProps {
  sources: AnswerSource[];
}

export const SourceCitations = ({ sources }: SourceCitationsProps) => {
  if (sources.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground">Sources Referenced</h4>
      
      {sources.map((source) => (
        <Card key={source.sourceNumber} className="p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-1">
              {source.sourceNumber}
            </Badge>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-sm truncate">{source.documentTitle}</h5>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{source.fileName}</span>
                  </div>
                </div>
                
                <Badge variant="secondary" className="text-xs shrink-0">
                  {Math.round(source.similarity * 100)}% match
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                {source.chunkText}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
