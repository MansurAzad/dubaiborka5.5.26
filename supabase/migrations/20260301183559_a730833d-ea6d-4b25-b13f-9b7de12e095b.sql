
-- Drop the overly permissive insert policy and replace with a more restrictive one
DROP POLICY "Service can insert chat histories" ON public.chat_histories;

-- Only service role (edge functions) will insert, so no anon insert policy needed
-- The admin ALL policy already covers admin access
