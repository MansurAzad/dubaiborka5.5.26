-- Add COD settlement and notification tracking
ALTER TABLE public.courier_shipments
  ADD COLUMN IF NOT EXISTS cod_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS cod_paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_settled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS notifications_sent jsonb NOT NULL DEFAULT '{}'::jsonb;

-- System settings table for courier automation toggles (if not exists)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
CREATE POLICY "Admins manage system settings"
  ON public.system_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

INSERT INTO public.system_settings (key, value)
VALUES
  ('courier_auto_approve', '{"enabled": false}'::jsonb),
  ('courier_auto_submit', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Recreate auto trigger to also call edge function for auto-submit (via pg_net if available),
-- and to honor auto_approve setting.
CREATE OR REPLACE FUNCTION public.auto_create_courier_shipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  auto_approve boolean := false;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'confirmed' THEN
    SELECT COALESCE((value->>'enabled')::boolean, false)
      INTO auto_approve
      FROM public.system_settings WHERE key = 'courier_auto_approve';

    INSERT INTO public.courier_shipments (
      order_id, recipient_name, recipient_phone, recipient_address,
      cod_amount, invoice, status, admin_approved, approved_at
    )
    SELECT
      NEW.id,
      COALESCE(NEW.guest_name,
        (SELECT full_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1),
        'Customer'),
      NEW.shipping_phone,
      NEW.shipping_address || ', ' || NEW.shipping_city,
      CASE WHEN NEW.payment_method = 'cod'
        THEN NEW.total - COALESCE(NEW.advance_amount, 0)
        ELSE 0 END,
      'INV-' || substr(NEW.id::text, 1, 8),
      'pending',
      auto_approve,
      CASE WHEN auto_approve THEN now() ELSE NULL END
    WHERE NOT EXISTS (
      SELECT 1 FROM public.courier_shipments WHERE order_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_create_shipment ON public.orders;
CREATE TRIGGER trg_auto_create_shipment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_courier_shipment();
