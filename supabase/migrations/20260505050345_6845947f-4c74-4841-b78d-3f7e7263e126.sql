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
      ON CONFLICT (user_id, permission) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_user_role_assigned_moderator ON public.user_roles;
DROP TRIGGER IF EXISTS trg_assign_default_moderator_permissions ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_assign_default_moderator_permissions ON public.user_roles;

CREATE TRIGGER trg_user_roles_assign_default_moderator_permissions
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'moderator')
EXECUTE FUNCTION public.assign_default_moderator_permissions();

DROP TRIGGER IF EXISTS on_user_role_removed_moderator ON public.user_roles;
DROP TRIGGER IF EXISTS trg_cleanup_moderator_permissions ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_cleanup_moderator_permissions ON public.user_roles;

CREATE TRIGGER trg_user_roles_cleanup_moderator_permissions
AFTER DELETE ON public.user_roles
FOR EACH ROW
WHEN (OLD.role = 'moderator')
EXECUTE FUNCTION public.cleanup_moderator_permissions();

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
ON CONFLICT (user_id, permission) DO NOTHING;