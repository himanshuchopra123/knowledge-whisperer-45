import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, RefreshCw, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  iconLink: string | null;
  webViewLink: string | null;
}

interface GoogleDriveImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export const GoogleDriveImportDialog = ({ open, onOpenChange, onImportComplete }: GoogleDriveImportDialogProps) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in first");
      }

      const { data, error } = await supabase.functions.invoke('google-drive-import', {
        body: { action: 'list' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setFiles(data.files || []);
    } catch (error: any) {
      console.error('Error fetching Google Drive files:', error);
      toast({
        title: "Error",
        description: "Failed to load Google Drive files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) return;

    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in first");
      }

      const { data, error } = await supabase.functions.invoke('google-drive-import', {
        body: { 
          action: 'import',
          fileIds: Array.from(selectedFiles),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });

      setSelectedFiles(new Set());
      onOpenChange(false);
      onImportComplete();
    } catch (error: any) {
      console.error('Error importing files:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import files",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.document') {
      return '📝';
    } else if (mimeType === 'application/pdf') {
      return '📕';
    } else if (mimeType.includes('word')) {
      return '📘';
    }
    return '📄';
  };

  const getFileTypeName = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.document') {
      return 'Google Doc';
    } else if (mimeType === 'application/pdf') {
      return 'PDF';
    } else if (mimeType.includes('word')) {
      return 'Word Doc';
    } else if (mimeType === 'text/plain') {
      return 'Text File';
    }
    return 'Document';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Google Drive</DialogTitle>
          <DialogDescription>
            Select documents to import into your knowledge base
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={files.length > 0 && selectedFiles.size === files.length}
                onCheckedChange={toggleAll}
                disabled={loading || files.length === 0}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All
              </label>
              <span className="text-sm text-muted-foreground">
                ({selectedFiles.size} of {files.length} selected)
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>No documents found in your Google Drive</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleFile(file.id)}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                    />
                    <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFileTypeName(file.mimeType)} • Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={selectedFiles.size === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedFiles.size} File${selectedFiles.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
