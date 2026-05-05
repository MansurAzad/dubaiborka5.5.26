DELETE FROM public.staff_permissions sp
USING public.user_roles ur
WHERE sp.user_id = ur.user_id
  AND ur.role = 'moderator'
  AND sp.permission = 'settings.manage';

INSERT INTO public.staff_permissions (user_id, permission)
SELECT ur.user_id, perm.permission
FROM public.user_roles ur
CROSS JOIN unnest(ARRAY[
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
]) AS perm(permission)
WHERE ur.role = 'moderator'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.prevent_moderator_admin_only_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.permission = 'settings.manage'
     AND EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE user_id = NEW.user_id
         AND role = 'moderator'
     )
     AND NOT public.has_role(NEW.user_id, 'admin') THEN
    RAISE EXCEPTION 'settings.manage is admin-only and cannot be assigned to moderators';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_moderator_admin_only_permissions_trigger ON public.staff_permissions;
CREATE TRIGGER prevent_moderator_admin_only_permissions_trigger
BEFORE INSERT OR UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_moderator_admin_only_permissions();