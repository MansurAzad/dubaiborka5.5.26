
-- Remove duplicate triggers on order_items (keep only one)
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_order ON public.order_items;
DROP TRIGGER IF EXISTS deduct_stock_on_order_trigger ON public.order_items;
-- Keep deduct_stock_trigger

-- Remove duplicate triggers on orders
DROP TRIGGER IF EXISTS trigger_restore_stock_on_cancel ON public.orders;
-- Keep restore_stock_on_cancel_trigger

-- Remove duplicate triggers on products
DROP TRIGGER IF EXISTS notify_back_in_stock_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_slug_before_update ON public.products;
DROP TRIGGER IF EXISTS generate_slug_before_insert ON public.products;
DROP TRIGGER IF EXISTS generate_product_slug_trigger ON public.products;
-- Keep trigger_back_in_stock and trigger_generate_product_slug

-- Remove duplicate trigger on profiles
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
-- Keep generate_referral_code_trigger

-- Add missing handle_new_user trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
