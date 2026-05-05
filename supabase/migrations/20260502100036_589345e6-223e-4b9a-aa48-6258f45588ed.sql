-- Ensure profile auto-creation on signup (fixes signup blockers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Make handle_new_user resilient: never block signup on profile errors / duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Don't block auth signup if profile insert fails
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Make admin auto-assign resilient too
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.email = 'mansurazad@gmail.com' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_assign_admin_role failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Ensure unique constraint on profiles.user_id (required for ON CONFLICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_user_id_key'
  ) THEN
    -- Add a unique index instead if a duplicate-allowing column exists; safe no-op otherwise
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table OR unique_violation OR others THEN
      -- If duplicates exist, create a partial unique index later; just warn
      RAISE WARNING 'Could not add unique on profiles.user_id: %', SQLERRM;
    END;
  END IF;
END $$;

-- Moderator default permissions trigger (auto grant on role assignment)
DROP TRIGGER IF EXISTS on_user_role_assigned_moderator ON public.user_roles;
CREATE TRIGGER on_user_role_assigned_moderator
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_moderator_permissions();

-- Moderator permission cleanup trigger on role removal
DROP TRIGGER IF EXISTS on_user_role_removed_moderator ON public.user_roles;
CREATE TRIGGER on_user_role_removed_moderator
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_moderator_permissions();

-- Backfill: create profiles for existing auth users that have none
INSERT INTO public.profiles (user_id, full_name, phone)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Backfill: grant default permissions to any existing moderator without permissions
DO $$
DECLARE
  rec RECORD;
  default_perms TEXT[] := ARRAY[
    'orders.manage','orders.update_status','products.manage',
    'customers.view','reviews.manage','chat.view','coupons.manage',
    'shipping.manage','content.manage'
  ];
  perm TEXT;
BEGIN
  FOR rec IN
    SELECT ur.user_id FROM public.user_roles ur
    WHERE ur.role = 'moderator'
      AND NOT EXISTS (SELECT 1 FROM public.staff_permissions sp WHERE sp.user_id = ur.user_id)
  LOOP
    FOREACH perm IN ARRAY default_perms LOOP
      INSERT INTO public.staff_permissions (user_id, permission)
      VALUES (rec.user_id, perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;