-- Allow moderators to access only the admin data areas they have permission for.
-- These policies complement the existing admin policies and keep regular users unchanged.

-- Orders area
DROP POLICY IF EXISTS "Shipping staff can view all orders" ON public.orders;
CREATE POLICY "Shipping staff can view all orders"
ON public.orders
FOR SELECT
USING (
  public.has_permission(auth.uid(), 'orders.manage')
  OR public.has_permission(auth.uid(), 'reports.view')
);

DROP POLICY IF EXISTS "Shipping staff can update orders" ON public.orders;
CREATE POLICY "Shipping staff can update orders"
ON public.orders
FOR UPDATE
USING (public.has_permission(auth.uid(), 'orders.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'orders.manage'));

DROP POLICY IF EXISTS "Shipping staff can view order items" ON public.order_items;
CREATE POLICY "Shipping staff can view order items"
ON public.order_items
FOR SELECT
USING (
  public.has_permission(auth.uid(), 'orders.manage')
  OR public.has_permission(auth.uid(), 'reports.view')
);

DROP POLICY IF EXISTS "Shipping staff can manage returns" ON public.returns;
CREATE POLICY "Shipping staff can manage returns"
ON public.returns
FOR ALL
USING (public.has_permission(auth.uid(), 'orders.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'orders.manage'));

-- Product management area
DROP POLICY IF EXISTS "Product staff can manage products" ON public.products;
CREATE POLICY "Product staff can manage products"
ON public.products
FOR ALL
USING (public.has_permission(auth.uid(), 'products.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'products.manage'));

DROP POLICY IF EXISTS "Product staff can manage variants" ON public.product_variants;
CREATE POLICY "Product staff can manage variants"
ON public.product_variants
FOR ALL
USING (public.has_permission(auth.uid(), 'products.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'products.manage'));

DROP POLICY IF EXISTS "Product staff can manage product images" ON public.product_images;
CREATE POLICY "Product staff can manage product images"
ON public.product_images
FOR ALL
USING (public.has_permission(auth.uid(), 'products.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'products.manage'));

DROP POLICY IF EXISTS "Product staff can manage categories" ON public.categories;
CREATE POLICY "Product staff can manage categories"
ON public.categories
FOR ALL
USING (public.has_permission(auth.uid(), 'products.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'products.manage'));

-- Customer, reviews, chat
DROP POLICY IF EXISTS "Customer staff can view profiles" ON public.profiles;
CREATE POLICY "Customer staff can view profiles"
ON public.profiles
FOR SELECT
USING (public.has_permission(auth.uid(), 'customers.view'));

DROP POLICY IF EXISTS "Review staff can manage all reviews" ON public.product_reviews;
CREATE POLICY "Review staff can manage all reviews"
ON public.product_reviews
FOR ALL
USING (public.has_permission(auth.uid(), 'reviews.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'reviews.manage'));

DROP POLICY IF EXISTS "Chat staff can manage chat histories" ON public.chat_histories;
CREATE POLICY "Chat staff can manage chat histories"
ON public.chat_histories
FOR ALL
USING (public.has_permission(auth.uid(), 'chat.view'))
WITH CHECK (public.has_permission(auth.uid(), 'chat.view'));

-- Marketing / content
DROP POLICY IF EXISTS "Coupon staff can manage coupons" ON public.coupons;
CREATE POLICY "Coupon staff can manage coupons"
ON public.coupons
FOR ALL
USING (public.has_permission(auth.uid(), 'coupons.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'coupons.manage'));

DROP POLICY IF EXISTS "Content staff can manage site content" ON public.site_content;
CREATE POLICY "Content staff can manage site content"
ON public.site_content
FOR ALL
USING (public.has_permission(auth.uid(), 'content.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

DROP POLICY IF EXISTS "Content staff can manage blog posts" ON public.blog_posts;
CREATE POLICY "Content staff can manage blog posts"
ON public.blog_posts
FOR ALL
USING (public.has_permission(auth.uid(), 'content.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

DROP POLICY IF EXISTS "Content staff can manage social proof messages" ON public.social_proof_messages;
CREATE POLICY "Content staff can manage social proof messages"
ON public.social_proof_messages
FOR ALL
USING (public.has_permission(auth.uid(), 'content.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

DROP POLICY IF EXISTS "Content staff can manage newsletters" ON public.newsletter_subscribers;
CREATE POLICY "Content staff can manage newsletters"
ON public.newsletter_subscribers
FOR ALL
USING (public.has_permission(auth.uid(), 'content.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

DROP POLICY IF EXISTS "Content staff can manage campaigns" ON public.email_campaigns;
CREATE POLICY "Content staff can manage campaigns"
ON public.email_campaigns
FOR ALL
USING (public.has_permission(auth.uid(), 'content.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

-- Shipping
DROP POLICY IF EXISTS "Shipping staff can manage zones" ON public.delivery_zones;
CREATE POLICY "Shipping staff can manage zones"
ON public.delivery_zones
FOR ALL
USING (public.has_permission(auth.uid(), 'shipping.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'shipping.manage'));

-- Reports: read-only supporting data
DROP POLICY IF EXISTS "Report staff can view products" ON public.products;
CREATE POLICY "Report staff can view products"
ON public.products
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view reviews" ON public.product_reviews;
CREATE POLICY "Report staff can view reviews"
ON public.product_reviews
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view profiles" ON public.profiles;
CREATE POLICY "Report staff can view profiles"
ON public.profiles
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view coupons" ON public.coupons;
CREATE POLICY "Report staff can view coupons"
ON public.coupons
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view returns" ON public.returns;
CREATE POLICY "Report staff can view returns"
ON public.returns
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));
