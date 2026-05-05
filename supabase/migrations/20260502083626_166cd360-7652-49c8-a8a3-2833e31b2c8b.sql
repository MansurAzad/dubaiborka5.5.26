-- Activity log table for role-based actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_role ON public.activity_logs(user_role, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage activity logs"
  ON public.activity_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function: assign default moderator permissions on role grant
CREATE OR REPLACE FUNCTION public.assign_default_moderator_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_perms TEXT[] := ARRAY[
    'orders.manage',
    'orders.update_status',
    'products.manage',
    'customers.view',
    'reviews.manage',
    'chat.view',
    'coupons.manage',
    'shipping.manage',
    'content.manage'
  ];
  perm TEXT;
BEGIN
  IF NEW.role = 'moderator' THEN
    FOREACH perm IN ARRAY default_perms LOOP
      INSERT INTO public.staff_permissions (user_id, permission, granted_by)
      VALUES (NEW.user_id, perm, auth.uid())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_default_moderator_permissions ON public.user_roles;
CREATE TRIGGER trg_assign_default_moderator_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_moderator_permissions();

-- Function: clean staff_permissions when moderator role removed
CREATE OR REPLACE FUNCTION public.cleanup_moderator_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'moderator' THEN
    DELETE FROM public.staff_permissions WHERE user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_moderator_permissions ON public.user_roles;
CREATE TRIGGER trg_cleanup_moderator_permissions
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_moderator_permissions();

-- Add unique constraint to staff_permissions to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_permissions_user_permission_unique'
  ) THEN
    ALTER TABLE public.staff_permissions
      ADD CONSTRAINT staff_permissions_user_permission_unique UNIQUE (user_id, permission);
  END IF;
END $$;

-- Helper RPC: check if user has specific permission (admin always true, moderator checks staff_permissions)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.staff_permissions
      WHERE user_id = _user_id AND permission = _permission
    );
$$;