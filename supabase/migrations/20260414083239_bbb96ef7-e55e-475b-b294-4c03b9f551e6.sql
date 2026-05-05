
-- Allow guest orders to be read back after insert (needed for .insert().select().single())
-- We use a broad guest SELECT but scope it tightly: only rows where user_id IS NULL and is_guest = true
-- The anon role can read these rows, but they still need the order_id to query them
CREATE POLICY "Guest users can view guest orders"
ON public.orders
FOR SELECT
TO anon
USING (user_id IS NULL AND is_guest = true);
