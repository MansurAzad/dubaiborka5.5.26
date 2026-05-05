
-- order_items: keep order_items_deduct_stock
DROP TRIGGER IF EXISTS deduct_stock_trigger ON public.order_items;

-- orders: keep the new ones
DROP TRIGGER IF EXISTS check_order_rate_limit_trigger ON public.orders;
DROP TRIGGER IF EXISTS restore_stock_on_cancel_trigger ON public.orders;
DROP TRIGGER IF EXISTS trg_auto_create_shipment ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_status_to_chat ON public.orders;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- products: keep products_*
DROP TRIGGER IF EXISTS trigger_back_in_stock ON public.products;
DROP TRIGGER IF EXISTS trigger_generate_product_slug ON public.products;

-- profiles
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- user_roles
DROP TRIGGER IF EXISTS trg_user_roles_assign_default_moderator_permissions ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_cleanup_moderator_permissions ON public.user_roles;

-- staff_permissions
DROP TRIGGER IF EXISTS prevent_moderator_admin_only_permissions_trigger ON public.staff_permissions;

-- updated_at duplicates across tables
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_chat_histories_updated_at ON public.chat_histories;
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
DROP TRIGGER IF EXISTS update_courier_shipments_updated_at ON public.courier_shipments;
DROP TRIGGER IF EXISTS update_customer_segments_updated_at ON public.customer_segments;
DROP TRIGGER IF EXISTS update_delivery_zones_updated_at ON public.delivery_zones;
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
DROP TRIGGER IF EXISTS update_returns_updated_at ON public.returns;
DROP TRIGGER IF EXISTS update_saved_addresses_updated_at ON public.saved_addresses;
DROP TRIGGER IF EXISTS update_site_content_updated_at ON public.site_content;

-- auth.users duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
