import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export const DocumentUpload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileId = newFiles[i].id;

      try {
        // Get user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upload to storage
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        updateFileStatus(fileId, { progress: 30, status: 'uploading' });

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        updateFileStatus(fileId, { progress: 60, status: 'processing' });

        // Create document record
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        updateFileStatus(fileId, { progress: 80, status: 'processing' });

        // Call edge function to process document (chunk & embed)
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: { documentId: document.id }
        });

        if (processError) throw processError;

        updateFileStatus(fileId, { progress: 100, status: 'complete' });

        toast({
          title: 'Upload successful',
          description: `${file.name} has been uploaded and is ready for search.`,
        });
      } catch (error: any) {
        updateFileStatus(fileId, {
          status: 'error',
          error: error.message,
        });

        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const updateFileStatus = (fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "cursor-pointer border-2 border-dashed transition-all hover-scale",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <input {...getInputProps()} />
          <Upload className={cn(
            "h-12 w-12 mb-4",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop files here' : 'Upload Documents'}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Drag & drop your documents or click to browse
          </p>
          <Button variant="outline" size="sm">
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supports PDF, Word, PowerPoint, Text (max 20MB)
          </p>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <Card key={file.id} className="animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        {file.status === 'complete' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {file.status === 'uploading' && ' • Uploading...'}
                      {file.status === 'processing' && ' • Processing...'}
                      {file.status === 'complete' && ' • Ready'}
                      {file.status === 'error' && ` • ${file.error}`}
                    </p>
                    {file.status !== 'complete' && file.status !== 'error' && (
                      <Progress value={file.progress} className="h-1" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
