import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveImportDialog } from './GoogleDriveImportDialog';

interface GoogleDriveConnectorProps {
  connection: any;
  onDisconnect: () => void;
  onConnectionChange: () => void;
}

export const GoogleDriveConnector = ({ connection, onDisconnect, onConnectionChange }: GoogleDriveConnectorProps) => {
  const [connecting, setConnecting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Please log in to connect your Google Drive");
      }

      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Error connecting to Google Drive:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start Google Drive connection",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  if (!connection) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 5.97L11.14 9.5 7.71 3.5zm7.74 0L8.89 15l3.43 5.97h6.53l3.43-5.97L15.45 3.5h-0zm0.99 9L11.88 21h6.53l3.43-5.97L12 12.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium">Google Drive</h3>
            <p className="text-sm text-muted-foreground">Import documents from your Google Drive</p>
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
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l3.43 5.97L11.14 9.5 7.71 3.5zm7.74 0L8.89 15l3.43 5.97h6.53l3.43-5.97L15.45 3.5h-0zm0.99 9L11.88 21h6.53l3.43-5.97L12 12.5z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Google Drive</h3>
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.email || 'Account connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Import Files
          </Button>
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <GoogleDriveImportDialog 
        open={showImport} 
        onOpenChange={setShowImport}
        onImportComplete={onConnectionChange}
      />
    </>
  );
};
