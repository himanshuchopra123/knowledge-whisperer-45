import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, LogOut, Upload } from 'lucide-react';

const Search = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <SearchIcon className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Knowledge Base</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Search your knowledge base
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers across all your documents in seconds
            </p>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ask a question or search for anything..."
              className="h-14 pl-12 text-lg"
            />
          </div>

          <div className="text-center">
            <Button size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Upload Documents
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Search;
