import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Zap, Link2, FileSearch } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Knowledge Base Search</span>
          </div>
          <RouterLink to="/login">
            <Button variant="outline">Sign In</Button>
          </RouterLink>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Find any answer across{' '}
              <span className="text-primary">Slack, Drive & Notion</span>
              {' '}in &lt;2 seconds
            </h1>
            <p className="text-xl text-muted-foreground sm:text-2xl">
              AI-powered search that understands context and delivers instant answers with citations
            </p>

            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Try: 'What's our Q4 strategy?' or 'Team meeting notes'"
                className="h-14 pl-12 text-lg"
                disabled
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border bg-muted px-2 py-1 text-xs text-muted-foreground">
                ⌘K
              </kbd>
            </div>

            <RouterLink to="/login">
              <Button size="lg" className="h-12 px-8 text-lg">
                Start Free Trial
              </Button>
            </RouterLink>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Instant Answers</CardTitle>
                  <CardDescription>
                    Get AI-generated answers in under 2 seconds, not endless search results
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Our semantic search understands intent, synthesizes information, and delivers
                  precise answers from across your knowledge base.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileSearch className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Smart Citations</CardTitle>
                  <CardDescription>
                    Every answer includes source links with inline citations
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Verify answers instantly with clickable citations that take you directly to
                  the source document, message, or file.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Cross-Platform Search</CardTitle>
                  <CardDescription>
                    Search across Slack, Google Drive, Notion, and more
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  One search to rule them all. No more switching between tools to find
                  information scattered across platforms.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Knowledge Base Search. Built for Product Managers.
        </div>
      </footer>
    </div>
  );
};

export default Index;
