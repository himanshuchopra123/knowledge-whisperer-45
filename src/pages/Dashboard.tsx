import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, LogOut, FileText, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [searchCount, setSearchCount] = useState<number>(0);
  const [connectorCount, setConnectorCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch document count
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });
        
        // Fetch search history count
        const { count: searchHistoryCount } = await supabase
          .from('search_history')
          .select('*', { count: 'exact', head: true });
        
        // Fetch connector counts
        const { count: notionCount } = await supabase
          .from('notion_connections')
          .select('*', { count: 'exact', head: true });
        
        const { count: driveCount } = await supabase
          .from('google_drive_connections')
          .select('*', { count: 'exact', head: true });

        setDocumentCount(docCount || 0);
        setSearchCount(searchHistoryCount || 0);
        setConnectorCount((notionCount || 0) + (driveCount || 0));
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Knowledge Base</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/search">
              <Button variant="ghost" size="sm">Search</Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="sm">Settings</Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your knowledge base and monitor usage</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Documents</CardTitle>
              <CardDescription>Total indexed documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : documentCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Searches</CardTitle>
              <CardDescription>Total searches performed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : searchCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Connectors</CardTitle>
              <CardDescription>Active integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : connectorCount}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
