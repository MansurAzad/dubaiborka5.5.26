
-- Remove duplicate triggers on order_items
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_order ON public.order_items;

-- Remove duplicate triggers on orders
DROP TRIGGER IF EXISTS trigger_check_order_rate_limit ON public.orders;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_cancel ON public.orders;

-- Add missing handle_new_user trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add missing auto_assign_admin_role trigger
CREATE OR REPLACE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();
