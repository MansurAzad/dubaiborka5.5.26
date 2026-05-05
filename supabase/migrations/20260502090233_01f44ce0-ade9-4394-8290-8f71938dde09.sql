
-- Track Steadfast courier shipments per order
CREATE TABLE IF NOT EXISTS public.courier_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  courier TEXT NOT NULL DEFAULT 'steadfast',
  consignment_id TEXT,
  tracking_code TEXT,
  invoice TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  cod_amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  delivery_status TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  raw_response JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_shipments_order ON public.courier_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_shipments_status ON public.courier_shipments(status);
CREATE INDEX IF NOT EXISTS idx_courier_shipments_consignment ON public.courier_shipments(consignment_id);

ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage courier shipments"
  ON public.courier_shipments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators with shipping permission can manage"
  ON public.courier_shipments FOR ALL
  USING (has_permission(auth.uid(), 'shipping.manage'))
  WITH CHECK (has_permission(auth.uid(), 'shipping.manage'));

CREATE TRIGGER update_courier_shipments_updated_at
  BEFORE UPDATE ON public.courier_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a pending shipment row when order status moves to confirmed
CREATE OR REPLACE FUNCTION public.auto_create_courier_shipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'confirmed' THEN
    INSERT INTO public.courier_shipments (
      order_id, recipient_name, recipient_phone, recipient_address, cod_amount, invoice, status
    )
    SELECT
      NEW.id,
      COALESCE(NEW.guest_name, (SELECT full_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1), 'Customer'),
      NEW.shipping_phone,
      NEW.shipping_address || ', ' || NEW.shipping_city,
      CASE WHEN NEW.payment_method = 'cod' THEN NEW.total - COALESCE(NEW.advance_amount, 0) ELSE 0 END,
      'INV-' || substr(NEW.id::text, 1, 8),
      'pending'
    WHERE NOT EXISTS (SELECT 1 FROM public.courier_shipments WHERE order_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_shipment ON public.orders;
CREATE TRIGGER trg_auto_create_shipment
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_courier_shipment();
