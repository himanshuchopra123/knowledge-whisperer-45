import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface ExampleQueriesProps {
  onQueryClick: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  "What's the latest payments PRD?",
  "Find Q2 roadmap priorities",
  "Show customer feedback from last week",
  "What did we decide about the refund flow?",
  "Find competitive analysis docs"
];

export const ExampleQueries = ({ onQueryClick }: ExampleQueriesProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lightbulb className="h-5 w-5" />
        <span className="text-sm font-medium">Try these example searches:</span>
      </div>
      
      <div className="grid gap-3">
        {EXAMPLE_QUERIES.map((query, index) => (
          <Card
            key={index}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary hover-scale group"
            onClick={() => onQueryClick(query)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{query}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
