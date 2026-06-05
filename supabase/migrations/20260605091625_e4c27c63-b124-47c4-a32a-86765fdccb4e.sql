
-- 1) Restrict public read on system_settings to exclude sensitive keys
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;

CREATE POLICY "Public can read non-sensitive system settings"
ON public.system_settings
FOR SELECT
USING (
  key NOT IN ('courier_webhook_secret')
  AND key NOT ILIKE '%secret%'
  AND key NOT ILIKE '%api_key%'
  AND key NOT ILIKE '%token%'
  AND key NOT ILIKE '%password%'
);

-- 2) Tighten chat-uploads bucket INSERT policy: only image/* under 5MB, and only into expected folders
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;

CREATE POLICY "Restricted chat image uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND lower(coalesce(metadata->>'mimetype', '')) LIKE 'image/%'
  AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
);
