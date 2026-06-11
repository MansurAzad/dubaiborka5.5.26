DROP POLICY IF EXISTS "Service can delete chat uploads" ON storage.objects;
CREATE POLICY "Admins can delete chat uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-uploads' AND public.has_role(auth.uid(), 'admin'));