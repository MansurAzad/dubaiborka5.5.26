
-- Drop and recreate all triggers to ensure consistency

-- Drop existing triggers first (safe - won't error if they don't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS generate_slug_before_insert ON public.products;
DROP TRIGGER IF EXISTS generate_slug_before_update ON public.products;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
DROP TRIGGER IF EXISTS deduct_stock_trigger ON public.order_items;
DROP TRIGGER IF EXISTS restore_stock_on_cancel_trigger ON public.orders;
DROP TRIGGER IF EXISTS notify_back_in_stock_trigger ON public.products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
DROP TRIGGER IF EXISTS update_delivery_zones_updated_at ON public.delivery_zones;
DROP TRIGGER IF EXISTS update_site_content_updated_at ON public.site_content;
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
DROP TRIGGER IF EXISTS update_saved_addresses_updated_at ON public.saved_addresses;
DROP TRIGGER IF EXISTS update_returns_updated_at ON public.returns;
DROP TRIGGER IF EXISTS update_customer_segments_updated_at ON public.customer_segments;
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
DROP TRIGGER IF EXISTS update_chat_histories_updated_at ON public.chat_histories;

-- Recreate all triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER generate_slug_before_insert
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_slug();

CREATE TRIGGER generate_slug_before_update
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_slug();

CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

CREATE TRIGGER deduct_stock_trigger
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order();

CREATE TRIGGER restore_stock_on_cancel_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();

CREATE TRIGGER notify_back_in_stock_trigger
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_back_in_stock();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_addresses_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_histories_updated_at
  BEFORE UPDATE ON public.chat_histories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
