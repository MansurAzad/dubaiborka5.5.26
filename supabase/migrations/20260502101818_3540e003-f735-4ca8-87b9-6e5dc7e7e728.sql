
-- Add reports.view to moderator default permissions so they can access /admin Dashboard
CREATE OR REPLACE FUNCTION public.assign_default_moderator_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    'content.manage',
    'reports.view'
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
$function$;

-- Backfill reports.view for existing moderators
INSERT INTO public.staff_permissions (user_id, permission)
SELECT ur.user_id, 'reports.view'
FROM public.user_roles ur
WHERE ur.role = 'moderator'
ON CONFLICT DO NOTHING;
