
-- Add tracking fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS courier_name text,
ADD COLUMN IF NOT EXISTS estimated_delivery timestamp with time zone;

-- Create reward_points table
CREATE TABLE public.reward_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  type text NOT NULL, -- 'earned', 'redeemed', 'referral_bonus'
  description text,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.reward_points
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert points" ON public.reward_points
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage points" ON public.reward_points
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  referred_user_id uuid REFERENCES auth.users(id),
  discount_percent numeric NOT NULL DEFAULT 10,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create own referral codes" ON public.referrals
FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Anyone can use a referral code" ON public.referrals
FOR UPDATE USING (is_used = false);

CREATE POLICY "Admins can manage referrals" ON public.referrals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code to profiles for easy access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Add points_used to orders for redemption tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS points_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_discount numeric DEFAULT 0;

-- Function to generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.referral_code := upper(substr(md5(random()::text), 1, 8));
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = upper(substr(md5(random()::text), 1, 8)) WHERE referral_code IS NULL;
