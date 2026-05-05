
CREATE OR REPLACE FUNCTION public.auto_create_courier_shipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  auto_approve boolean := false;
  auto_submit  boolean := false;
  new_ship_id  uuid;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'confirmed' THEN
    SELECT COALESCE((value->>'enabled')::boolean, false) INTO auto_approve
      FROM public.system_settings WHERE key = 'courier_auto_approve';
    SELECT COALESCE((value->>'enabled')::boolean, false) INTO auto_submit
      FROM public.system_settings WHERE key = 'courier_auto_submit';

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
    )
    RETURNING id INTO new_ship_id;

    -- Real-time auto-submit: only when BOTH approve and submit toggles are on.
    IF auto_approve AND auto_submit AND new_ship_id IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://izeabmhtxtrelfqgkuua.supabase.co/functions/v1/steadfast-courier',
          headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZWFibWh0eHRyZWxmcWdrdXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjMzMzksImV4cCI6MjA5MzUzOTMzOX0.ksgeJhbbDI0AsnR9IaP_BjurbGHHODuHAXf4AgUWI0Q"}'::jsonb,
          body := jsonb_build_object('action','auto_submit_pending')
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto-submit dispatch failed: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
