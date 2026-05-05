
-- Fix: Allow guest users to insert order items for their guest orders
CREATE POLICY "Guest users can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id IS NULL
      AND orders.is_guest = true
  )
);

-- Fix: Allow guest users to view their order items (via order_id match)
CREATE POLICY "Guest users can view order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id IS NULL
      AND orders.is_guest = true
  )
);

-- Rate limiting function for orders (10 min cooldown, max 3 per 24h per phone)
CREATE OR REPLACE FUNCTION public.check_order_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
  last_order_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check orders in last 10 minutes by same phone
  SELECT created_at INTO last_order_time
  FROM public.orders
  WHERE shipping_phone = NEW.shipping_phone
    AND created_at > now() - interval '10 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_order_time IS NOT NULL THEN
    RAISE EXCEPTION 'আপনি ১০ মিনিটের মধ্যে আবার অর্ডার দিতে পারবেন না। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।';
  END IF;

  -- Check max 3 orders in 24 hours by same phone
  SELECT COUNT(*) INTO recent_count
  FROM public.orders
  WHERE shipping_phone = NEW.shipping_phone
    AND created_at > now() - interval '24 hours';

  IF recent_count >= 3 THEN
    RAISE EXCEPTION '২৪ ঘণ্টায় সর্বোচ্চ ৩টি অর্ডার দেওয়া যায়। অনুগ্রহ করে পরে চেষ্টা করুন।';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply rate limit trigger on orders
CREATE TRIGGER check_order_rate_limit_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_rate_limit();
