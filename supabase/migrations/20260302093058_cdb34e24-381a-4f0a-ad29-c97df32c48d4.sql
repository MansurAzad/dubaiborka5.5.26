
-- Add material column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material text DEFAULT NULL;

-- Create back_in_stock_alerts table
CREATE TABLE IF NOT EXISTS public.back_in_stock_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.back_in_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe to alerts (no auth required)
CREATE POLICY "Anyone can create back in stock alerts"
  ON public.back_in_stock_alerts FOR INSERT
  WITH CHECK (true);

-- Admins can manage all alerts
CREATE POLICY "Admins can manage back in stock alerts"
  ON public.back_in_stock_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient lookup
CREATE INDEX idx_back_in_stock_product ON public.back_in_stock_alerts(product_id, notified);

-- Create trigger to send email when product is restocked
CREATE OR REPLACE FUNCTION public.notify_back_in_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When stock goes from 0 to > 0, mark alerts for notification
  IF (OLD.stock IS NULL OR OLD.stock <= 0) AND NEW.stock > 0 THEN
    UPDATE public.back_in_stock_alerts
    SET notified = true
    WHERE product_id = NEW.id AND notified = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_back_in_stock
AFTER UPDATE OF stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_back_in_stock();
