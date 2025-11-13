import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, TrendingUp } from 'lucide-react';
import { SearchResult } from '@/lib/searchService';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

export const SearchResults = ({ results, query }: SearchResultsProps) => {
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-primary/20 text-foreground font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.7) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  if (results.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {results.map((result) => (
        <Card key={result.id} className="p-6 hover:shadow-md transition-shadow">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-1 truncate">
                  {result.documentTitle}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate">{result.fileName}</span>
                  <span>•</span>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="font-mono text-xs">
                  {result.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                </Badge>
              </div>
            </div>

            {/* Content Preview */}
            <div className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-md">
              <p className="line-clamp-3">
                {highlightText(result.chunkText, query)}
              </p>
            </div>

            {/* Scores Footer */}
            <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Relevance:</span>
                <span className={`font-semibold ${getScoreColor(result.finalScore)}`}>
                  {(result.finalScore * 100).toFixed(0)}%
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Similarity:</span>
                <span className="font-semibold">
                  {(result.similarity * 100).toFixed(0)}%
                </span>
              </div>
              {result.chunkIndex > 0 && (
                <>
                  <span>•</span>
                  <span>Section {result.chunkIndex + 1}</span>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
