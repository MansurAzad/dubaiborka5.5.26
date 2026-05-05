-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  minimum_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add coupon tracking to orders
ALTER TABLE public.orders 
ADD COLUMN coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN discount_amount NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Everyone can view active coupons" 
ON public.coupons FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage coupons" 
ON public.coupons FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, minimum_order_amount, max_uses, valid_until) VALUES
('WELCOME10', 'নতুন কাস্টমারদের জন্য ১০% ছাড়', 'percentage', 10, 500, 100, now() + interval '1 year'),
('SAVE500', '৳৫০০ ছাড় - ৳৩০০০+ অর্ডারে', 'fixed', 500, 3000, 50, now() + interval '6 months'),
('EID25', 'ঈদ স্পেশাল ২৫% ছাড়', 'percentage', 25, 1000, 200, now() + interval '3 months');