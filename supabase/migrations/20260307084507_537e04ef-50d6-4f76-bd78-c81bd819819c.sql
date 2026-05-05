-- Create backups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-backups', 'site-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can access backups
CREATE POLICY "Admins can manage backups"
ON storage.objects FOR ALL
USING (bucket_id = 'site-backups' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-backups' AND public.has_role(auth.uid(), 'admin'));

-- Backup history table
CREATE TABLE IF NOT EXISTS public.backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name text NOT NULL,
  backup_type text NOT NULL DEFAULT 'full',
  tables_included text[] NOT NULL DEFAULT '{}',
  file_path text,
  file_size_bytes bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backup history"
ON public.backup_history FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));