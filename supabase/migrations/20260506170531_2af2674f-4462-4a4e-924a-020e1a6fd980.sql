
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create chat-uploads storage bucket (public, so AI vision can read URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-uploads',
  'chat-uploads',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Public read access for chat-uploads bucket
DROP POLICY IF EXISTS "Public can view chat uploads" ON storage.objects;
CREATE POLICY "Public can view chat uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-uploads');

-- Anyone can insert into chat-uploads (rate-limited in edge function)
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
CREATE POLICY "Anyone can upload chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-uploads');

-- Service role can delete (used by cleanup function)
DROP POLICY IF EXISTS "Service can delete chat uploads" ON storage.objects;
CREATE POLICY "Service can delete chat uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-uploads');

-- Tracking table for ephemeral chat uploads
CREATE TABLE IF NOT EXISTS public.chat_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  session_key text,
  ip_address text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_uploads_expires ON public.chat_uploads(expires_at) WHERE deleted = false;

ALTER TABLE public.chat_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert chat upload" ON public.chat_uploads;
CREATE POLICY "Anyone can insert chat upload"
  ON public.chat_uploads FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage chat uploads" ON public.chat_uploads;
CREATE POLICY "Admins can manage chat uploads"
  ON public.chat_uploads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Schedule cleanup every minute
SELECT cron.unschedule('chat-uploads-cleanup') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'chat-uploads-cleanup'
);

SELECT cron.schedule(
  'chat-uploads-cleanup',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://izeabmhtxtrelfqgkuua.supabase.co/functions/v1/chat-image-cleanup',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZWFibWh0eHRyZWxmcWdrdXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjMzMzksImV4cCI6MjA5MzUzOTMzOX0.ksgeJhbbDI0AsnR9IaP_BjurbGHHODuHAXf4AgUWI0Q"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
