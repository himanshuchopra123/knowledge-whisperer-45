import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export const SearchBar = ({ value, onChange, onSearch, isLoading }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch();
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything about your products..."
          className="h-16 pl-12 pr-32 text-lg rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange('')}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <kbd className="hidden sm:inline-flex h-8 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground">
            <span className="text-sm">⌘</span>K
          </kbd>
        </div>
      </div>
    </div>
  );
};
