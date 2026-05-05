
-- Auth user signup triggers
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_admin_role ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_role();

-- Profiles: referral code on insert
DROP TRIGGER IF EXISTS profiles_generate_referral_code ON public.profiles;
CREATE TRIGGER profiles_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- Products: slug + back-in-stock + updated_at
DROP TRIGGER IF EXISTS products_generate_slug ON public.products;
CREATE TRIGGER products_generate_slug
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_slug();

DROP TRIGGER IF EXISTS products_notify_back_in_stock ON public.products;
CREATE TRIGGER products_notify_back_in_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_back_in_stock();

-- Orders: rate limit + cancel restore + courier + chat sync + updated_at
DROP TRIGGER IF EXISTS orders_check_rate_limit ON public.orders;
CREATE TRIGGER orders_check_rate_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_order_rate_limit();

DROP TRIGGER IF EXISTS orders_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER orders_restore_stock_on_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();

DROP TRIGGER IF EXISTS orders_auto_create_shipment ON public.orders;
CREATE TRIGGER orders_auto_create_shipment
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_courier_shipment();

DROP TRIGGER IF EXISTS orders_sync_status_to_chat ON public.orders;
CREATE TRIGGER orders_sync_status_to_chat
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_status_to_chat();

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order items: stock deduction
DROP TRIGGER IF EXISTS order_items_deduct_stock ON public.order_items;
CREATE TRIGGER order_items_deduct_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order();

-- User roles: moderator default permissions + cleanup
DROP TRIGGER IF EXISTS user_roles_assign_default_permissions ON public.user_roles;
CREATE TRIGGER user_roles_assign_default_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_moderator_permissions();

DROP TRIGGER IF EXISTS user_roles_cleanup_moderator_permissions ON public.user_roles;
CREATE TRIGGER user_roles_cleanup_moderator_permissions
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_moderator_permissions();

-- Staff permissions: prevent moderator-admin-only
DROP TRIGGER IF EXISTS staff_permissions_prevent_admin_only ON public.staff_permissions;
CREATE TRIGGER staff_permissions_prevent_admin_only
  BEFORE INSERT OR UPDATE ON public.staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_moderator_admin_only_permissions();

-- updated_at triggers for tables that have updated_at column
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS cart_items_set_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_set_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS coupons_set_updated_at ON public.coupons;
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS delivery_zones_set_updated_at ON public.delivery_zones;
CREATE TRIGGER delivery_zones_set_updated_at BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS site_content_set_updated_at ON public.site_content;
CREATE TRIGGER site_content_set_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS social_proof_messages_set_updated_at ON public.social_proof_messages;
CREATE TRIGGER social_proof_messages_set_updated_at BEFORE UPDATE ON public.social_proof_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS courier_shipments_set_updated_at ON public.courier_shipments;
CREATE TRIGGER courier_shipments_set_updated_at BEFORE UPDATE ON public.courier_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS product_variants_set_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS product_reviews_set_updated_at ON public.product_reviews;
CREATE TRIGGER product_reviews_set_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS returns_set_updated_at ON public.returns;
CREATE TRIGGER returns_set_updated_at BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS saved_addresses_set_updated_at ON public.saved_addresses;
CREATE TRIGGER saved_addresses_set_updated_at BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS chat_histories_set_updated_at ON public.chat_histories;
CREATE TRIGGER chat_histories_set_updated_at BEFORE UPDATE ON public.chat_histories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS customer_segments_set_updated_at ON public.customer_segments;
CREATE TRIGGER customer_segments_set_updated_at BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS blocked_users_set_updated_at ON public.blocked_users;
CREATE TRIGGER blocked_users_set_updated_at BEFORE UPDATE ON public.blocked_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
