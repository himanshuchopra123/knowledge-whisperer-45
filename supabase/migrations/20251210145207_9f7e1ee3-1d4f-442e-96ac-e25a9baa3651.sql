-- Create google_drive_connections table
CREATE TABLE public.google_drive_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own google drive connections"
ON public.google_drive_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own google drive connections"
ON public.google_drive_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google drive connections"
ON public.google_drive_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google drive connections"
ON public.google_drive_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_drive_connections_updated_at
BEFORE UPDATE ON public.google_drive_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();