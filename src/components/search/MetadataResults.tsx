import { DocumentMetadata } from '@/lib/documentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, HardDrive } from 'lucide-react';
import { format } from 'date-fns';

interface MetadataResultsProps {
  documents: DocumentMetadata[];
  query: string;
}

export const MetadataResults = ({ documents, query }: MetadataResultsProps) => {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No documents found matching your query.</p>
        </CardContent>
      </Card>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
    return mimeType.split('/').pop()?.toUpperCase() || 'File';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Documents ({documents.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Results for: "{query}"
        </p>
      </div>
      
      <div className="grid gap-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">
                    {getFileTypeLabel(doc.fileType)}
                  </Badge>
                  {doc.sourceType && doc.sourceType !== 'upload' && (
                    <Badge variant="outline" className="capitalize">
                      {doc.sourceType}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
