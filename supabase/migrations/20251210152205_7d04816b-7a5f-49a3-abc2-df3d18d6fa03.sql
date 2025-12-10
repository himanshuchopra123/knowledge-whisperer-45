-- Add column to track Google Drive file IDs in documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'upload';

-- Add last sync timestamp to google_drive_connections
ALTER TABLE public.google_drive_connections ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean DEFAULT true;
ALTER TABLE public.google_drive_connections ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_source_id ON public.documents(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents(source_type);