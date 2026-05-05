
-- 1. Delivery Zones table
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  city TEXT NOT NULL,
  areas TEXT[] DEFAULT '{}',
  shipping_charge NUMERIC NOT NULL DEFAULT 0,
  estimated_days INTEGER DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add slug column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing products
UPDATE public.products 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- 3. Allow customers to cancel their own pending orders
CREATE POLICY "Users can cancel own pending orders" ON public.orders
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );
