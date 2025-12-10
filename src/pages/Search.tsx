import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, LogOut, Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPills, SourceFilter, TimeFilter, DocTypeFilter } from '@/components/search/FilterPills';
import { ExampleQueries } from '@/components/search/ExampleQueries';
import { SearchHistory } from '@/components/search/SearchHistory';
import { UploadDialog } from '@/components/search/UploadDialog';
import { SearchResults } from '@/components/search/SearchResults';
import { AnswerDisplay } from '@/components/search/AnswerDisplay';
import { SourceCitations } from '@/components/search/SourceCitations';
import { MetadataResults } from '@/components/search/MetadataResults';
import { Link } from 'react-router-dom';
import { performSemanticSearch, SearchResult } from '@/lib/searchService';
import { generateAnswer, AnswerResponse } from '@/lib/answerService';
import { parseQueryIntent, ParsedIntent } from '@/lib/intentService';
import { queryDocumentsByMetadata, DocumentMetadata } from '@/lib/documentService';
import { useToast } from '@/hooks/use-toast';

const Search = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sources, setSources] = useState<SourceFilter[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [docType, setDocType] = useState<DocTypeFilter>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [metadataResults, setMetadataResults] = useState<DocumentMetadata[]>([]);
  const [isMetadataQuery, setIsMetadataQuery] = useState(false);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);
    setMetadataResults([]);
    setAnswer(null);
    setIsMetadataQuery(false);
    
    try {
      // First, parse the query intent using AI
      console.log('Parsing query intent:', searchQuery);
      const intent = await parseQueryIntent(searchQuery);
      console.log('Parsed intent:', intent);
      
      // Show feedback if owner was detected
      if (intent.owner) {
        toast({
          title: `Searching for ${intent.owner}'s documents`,
          description: 'Looking for documents mentioning this person as author or owner',
        });
      }
      
      if (intent.isMetadataQuery) {
        // Handle metadata queries (latest, oldest, etc.)
        setIsMetadataQuery(true);
        
        const result = await queryDocumentsByMetadata(
          intent.sortBy === 'relevance' ? 'newest' : intent.sortBy,
          intent.limit || 10,
          intent.timeFilter,
          intent.docTypes
        );
        
        setMetadataResults(result.documents);
        setHistoryRefreshTrigger(prev => prev + 1);
        
        if (result.documents.length === 0) {
          toast({
            title: 'No documents found',
            description: 'No documents match your criteria',
          });
        }
      } else {
        // Handle semantic search queries
        setIsMetadataQuery(false);
        
        // Build filters from intent and UI filters
        const filters: any = {};
        
        if (sources.length > 0) {
          filters.sources = sources;
        }
        
        // Use intent time filter or UI time filter
        if (intent.timeFilter) {
          filters.timeFilter = intent.timeFilter;
        } else if (timeFilter !== 'all') {
          const now = new Date();
          const startDate = new Date();
          
          switch (timeFilter) {
            case 'today':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
          }
          
          filters.timeFilter = {
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
          };
        }
        
        // Use intent doc types or UI doc type filter
        if (intent.docTypes && intent.docTypes.length > 0) {
          filters.docTypes = intent.docTypes;
        } else if (docType !== 'all') {
          const typeMap: Record<DocTypeFilter, string[]> = {
            prd: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            roadmap: ['application/pdf', 'text/plain'],
            discussion: ['text/plain', 'text/markdown'],
            all: [],
          };
          filters.docTypes = typeMap[docType];
        }
        
        // Use the semantic query from intent or the original query
        const effectiveQuery = intent.searchQuery || searchQuery;
        console.log('Performing semantic search:', effectiveQuery, filters);
        
        const response = await performSemanticSearch(effectiveQuery, filters, intent.limit || 20, 0.15);
        
        setSearchResults(response.results);
        setHistoryRefreshTrigger(prev => prev + 1);
        
        if (response.results.length === 0) {
          toast({
            title: 'No results found',
            description: 'Try adjusting your search terms or filters',
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'An error occurred while searching',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateAnswer = async () => {
    if (!searchQuery.trim()) return;

    setIsGeneratingAnswer(true);
    try {
      // Build same filters as search
      const filters: any = {};
      
      if (sources.length > 0) {
        filters.sources = sources;
      }
      
      if (timeFilter !== 'all') {
        const now = new Date();
        const startDate = new Date();
        
        switch (timeFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        filters.timeFilter = {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        };
      }
      
      if (docType !== 'all') {
        const typeMap: Record<DocTypeFilter, string[]> = {
          prd: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          roadmap: ['application/pdf', 'text/plain'],
          discussion: ['text/plain', 'text/markdown'],
          all: [],
        };
        
        filters.docTypes = typeMap[docType];
      }

      const answerResponse = await generateAnswer(searchQuery, filters, 5);
      setAnswer(answerResponse);
      
      toast({
        title: 'Answer generated',
        description: 'AI has analyzed your knowledge base',
      });
    } catch (error) {
      console.error('Answer generation error:', error);
      toast({
        title: 'Failed to generate answer',
        description: error instanceof Error ? error.message : 'An error occurred while generating the answer',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAnswer(false);
    }
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

          {/* Filter Pills and Generate Answer Button */}
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <FilterPills
              sources={sources}
              onSourcesChange={setSources}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              docType={docType}
              onDocTypeChange={setDocType}
            />
            
            {hasSearched && searchResults.length > 0 && (
              <Button
                onClick={handleGenerateAnswer}
                disabled={isGeneratingAnswer}
                variant="default"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingAnswer ? "Generating..." : "Generate Answer"}
              </Button>
            )}
          </div>

          {/* Empty State - Example Queries */}
          {!hasSearched && (
            <div className="pt-8">
              <ExampleQueries onQueryClick={handleExampleQueryClick} />
            </div>
          )}

          {/* AI Answer and Sources */}
          {hasSearched && !isSearching && answer && (
            <div className="space-y-6">
              <AnswerDisplay answer={answer} />
              <SourceCitations sources={answer.sources} />
            </div>
          )}

          {/* Metadata Results (for queries like "latest document") */}
          {hasSearched && !isSearching && isMetadataQuery && (
            <MetadataResults documents={metadataResults} query={searchQuery} />
          )}

          {/* Semantic Search Results */}
          {hasSearched && !isSearching && !isMetadataQuery && (
            <SearchResults results={searchResults} query={searchQuery} />
          )}
        </div>
      </main>

      {/* Search History Sidebar */}
      <SearchHistory 
        onQueryClick={handleExampleQueryClick} 
        refreshTrigger={historyRefreshTrigger}
      />
    </div>
  );
};

export default Search;
