import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotionImportDialog } from './NotionImportDialog';

interface NotionConnectorProps {
  connection: any;
  onDisconnect: () => void;
  onConnectionChange: () => void;
}

export const NotionConnector = ({ connection, onDisconnect, onConnectionChange }: NotionConnectorProps) => {
  const [connecting, setConnecting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Get the current session to ensure we have a valid token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Please log in to connect your Notion account");
      }

      const { data, error } = await supabase.functions.invoke('notion-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Error connecting to Notion:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start Notion connection",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  if (!connection) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <div>
            <h3 className="font-medium">Notion</h3>
            <p className="text-sm text-muted-foreground">Import pages from your Notion workspace</p>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Notion</h3>
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.workspace_name || 'Workspace connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Import Pages
          </Button>
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <NotionImportDialog 
        open={showImport} 
        onOpenChange={setShowImport}
        onImportComplete={onConnectionChange}
      />
    </>
  );
};
