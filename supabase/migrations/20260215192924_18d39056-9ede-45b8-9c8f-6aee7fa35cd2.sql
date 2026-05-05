
-- Fix 1: Orders SELECT policy - prevent authenticated users from seeing ALL guest orders
-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

-- Recreate: users can only see their own orders (user_id must match, no NULL user_id access)
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Referrals UPDATE policy - restrict what can be updated
DROP POLICY IF EXISTS "Anyone can use a referral code" ON public.referrals;

-- Only allow setting referred_user_id to current user and marking as used, only if not already used
CREATE POLICY "Authenticated users can use a referral code"
ON public.referrals
FOR UPDATE
USING (is_used = false AND referred_user_id IS NULL)
WITH CHECK (is_used = true AND referred_user_id = auth.uid());
