import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Star, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  saved?: boolean;
}

interface SearchHistoryProps {
  onQueryClick: (query: string) => void;
}

export const SearchHistory = ({ onQueryClick }: SearchHistoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [recentSearches] = useState<SearchHistoryItem[]>([]);
  const [savedSearches] = useState<SearchHistoryItem[]>([]);

  return (
    <div
      className={cn(
        "fixed right-0 top-16 h-[calc(100vh-4rem)] bg-background border-l transition-all duration-300 z-40",
        isExpanded ? "w-80" : "w-12"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-4 top-4 h-8 w-8 rounded-full border bg-background shadow-md hover-scale"
      >
        {isExpanded ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="flex flex-col h-full p-4 space-y-4 animate-slide-in-right">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Search History</h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-6">
              {savedSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Star className="h-4 w-4" />
                    Saved Searches
                  </div>
                  <div className="space-y-2">
                    {savedSearches.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:bg-accent hover-scale transition-all"
                        onClick={() => onQueryClick(item.query)}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{item.query}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Searches
                </div>
                {recentSearches.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No recent searches yet. Start searching to see your history here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {recentSearches.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:bg-accent hover-scale transition-all"
                        onClick={() => onQueryClick(item.query)}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm font-medium line-clamp-2 mb-1">{item.query}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
