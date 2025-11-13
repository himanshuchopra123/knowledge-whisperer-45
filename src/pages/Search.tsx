import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, LogOut } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPills, SourceFilter, TimeFilter, DocTypeFilter } from '@/components/search/FilterPills';
import { ExampleQueries } from '@/components/search/ExampleQueries';
import { SearchHistory } from '@/components/search/SearchHistory';
import { UploadDialog } from '@/components/search/UploadDialog';
import { Link } from 'react-router-dom';

const Search = () => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sources, setSources] = useState<SourceFilter[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [docType, setDocType] = useState<DocTypeFilter>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // TODO: Implement actual search functionality
    console.log('Searching for:', searchQuery, { sources, timeFilter, docType });
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 1500);
  };

  const handleExampleQueryClick = (query: string) => {
    setSearchQuery(query);
    // Auto-search after a brief delay for better UX
    setTimeout(() => {
      handleSearch();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/search" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <SearchIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Knowledge Base</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="sm">Settings</Button>
            </Link>
            <UploadDialog />
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-20">
        <div className="space-y-8">
          {/* Search Bar */}
          <div className="pt-12">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              isLoading={isSearching}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex justify-center">
            <FilterPills
              sources={sources}
              onSourcesChange={setSources}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              docType={docType}
              onDocTypeChange={setDocType}
            />
          </div>

          {/* Empty State - Example Queries */}
          {!hasSearched && (
            <div className="pt-8">
              <ExampleQueries onQueryClick={handleExampleQueryClick} />
            </div>
          )}

          {/* Search Results Placeholder */}
          {hasSearched && !isSearching && (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center py-12 text-muted-foreground">
                Search results will appear here
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Search History Sidebar */}
      <SearchHistory onQueryClick={handleExampleQueryClick} />
    </div>
  );
};

export default Search;
