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
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEdited: string;
  icon: string | null;
}

interface NotionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export const NotionImportDialog = ({ open, onOpenChange, onImportComplete }: NotionImportDialogProps) => {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPages();
    }
  }, [open]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in first");
      }

      const { data, error } = await supabase.functions.invoke('notion-import', {
        body: { action: 'list' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setPages(data.pages || []);
    } catch (error: any) {
      console.error('Error fetching Notion pages:', error);
      toast({
        title: "Error",
        description: "Failed to load Notion pages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const toggleAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    if (selectedPages.size === 0) return;

    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in first");
      }

      const { data, error } = await supabase.functions.invoke('notion-import', {
        body: { 
          action: 'import',
          pageIds: Array.from(selectedPages),
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
        description: `Successfully imported ${successCount} page(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });

      setSelectedPages(new Set());
      onOpenChange(false);
      onImportComplete();
    } catch (error: any) {
      console.error('Error importing pages:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import pages",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Notion</DialogTitle>
          <DialogDescription>
            Select pages to import into your knowledge base
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={pages.length > 0 && selectedPages.size === pages.length}
                onCheckedChange={toggleAll}
                disabled={loading || pages.length === 0}
              />
              <span className="text-sm text-muted-foreground">
                {selectedPages.size} of {pages.length} selected
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchPages} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>No pages found in your Notion workspace</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => togglePage(page.id)}
                  >
                    <Checkbox
                      checked={selectedPages.has(page.id)}
                      onCheckedChange={() => togglePage(page.id)}
                    />
                    <span className="text-lg">{page.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Last edited: {new Date(page.lastEdited).toLocaleDateString()}
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
              disabled={selectedPages.size === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
