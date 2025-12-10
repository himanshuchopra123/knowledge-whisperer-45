import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, LogOut, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotionConnector } from '@/components/settings/NotionConnector';
import { GoogleDriveConnector } from '@/components/settings/GoogleDriveConnector';

const Settings = () => {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [notionConnection, setNotionConnection] = useState<any>(null);
  const [googleDriveConnection, setGoogleDriveConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback results - Notion
    const notionConnected = searchParams.get('notion');
    const notionError = searchParams.get('notion_error');

    if (notionConnected === 'connected') {
      toast({
        title: "Notion Connected",
        description: "Your Notion workspace has been successfully connected.",
      });
      window.history.replaceState({}, '', '/settings');
    }

    if (notionError) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(notionError),
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    }

    // Check for OAuth callback results - Google Drive
    const googleConnected = searchParams.get('google');
    const googleError = searchParams.get('google_error');

    if (googleConnected === 'connected') {
      toast({
        title: "Google Drive Connected",
        description: "Your Google Drive has been successfully connected.",
      });
      window.history.replaceState({}, '', '/settings');
    }

    if (googleError) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(googleError),
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    }

    fetchConnections();
  }, [searchParams, toast]);

  const fetchConnections = async () => {
    if (!user) return;
    
    try {
      // Fetch Notion connection
      const { data: notionData, error: notionError } = await supabase
        .from('notion_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (notionError && notionError.code !== 'PGRST116') {
        console.error('Error fetching Notion connection:', notionError);
      }
      setNotionConnection(notionData);

      // Fetch Google Drive connection
      const { data: googleData, error: googleError } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (googleError && googleError.code !== 'PGRST116') {
        console.error('Error fetching Google Drive connection:', googleError);
      }
      setGoogleDriveConnection(googleData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotionDisconnect = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notion_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotionConnection(null);
      toast({
        title: "Disconnected",
        description: "Your Notion workspace has been disconnected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGoogleDriveDisconnect = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('google_drive_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setGoogleDriveConnection(null);
      toast({
        title: "Disconnected",
        description: "Your Google Drive has been disconnected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
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
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure connectors and integrations</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connectors</CardTitle>
              <CardDescription>
                Connect your data sources to enable search across platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading connections...
                </div>
              ) : (
                <>
                  <NotionConnector 
                    connection={notionConnection}
                    onDisconnect={handleNotionDisconnect}
                    onConnectionChange={fetchConnections}
                  />
                  <GoogleDriveConnector 
                    connection={googleDriveConnection}
                    onDisconnect={handleGoogleDriveDisconnect}
                    onConnectionChange={fetchConnections}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
