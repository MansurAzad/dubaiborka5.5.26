CREATE TABLE IF NOT EXISTS public.courier_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid,
  order_id uuid,
  action text NOT NULL,
  actor_user_id uuid,
  actor_role text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_audit_shipment ON public.courier_audit_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_courier_audit_created ON public.courier_audit_logs(created_at DESC);

ALTER TABLE public.courier_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage courier audit logs"
ON public.courier_audit_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Shipping staff can view courier audit logs"
ON public.courier_audit_logs FOR SELECT
USING (has_permission(auth.uid(), 'shipping.manage'::text));

CREATE POLICY "Shipping staff can insert courier audit logs"
ON public.courier_audit_logs FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'shipping.manage'::text) AND auth.uid() = actor_user_id);