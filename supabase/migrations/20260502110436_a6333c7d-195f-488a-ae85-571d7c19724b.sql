-- Additional moderator policies for assigned pages that rely on related admin tables.

-- Customers page: allow customer staff to view order history and manage block status.
DROP POLICY IF EXISTS "Customer staff can view customer orders" ON public.orders;
CREATE POLICY "Customer staff can view customer orders"
ON public.orders
FOR SELECT
USING (public.has_permission(auth.uid(), 'customers.view'));

DROP POLICY IF EXISTS "Customer staff can manage blocked users" ON public.blocked_users;
CREATE POLICY "Customer staff can manage blocked users"
ON public.blocked_users
FOR ALL
USING (public.has_permission(auth.uid(), 'customers.view'))
WITH CHECK (public.has_permission(auth.uid(), 'customers.view'));

-- Chat page: allow chat staff to create/update related orders and order items from chat conversions.
DROP POLICY IF EXISTS "Chat staff can create orders" ON public.orders;
CREATE POLICY "Chat staff can create orders"
ON public.orders
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'chat.view'));

DROP POLICY IF EXISTS "Chat staff can update chat orders" ON public.orders;
CREATE POLICY "Chat staff can update chat orders"
ON public.orders
FOR UPDATE
USING (public.has_permission(auth.uid(), 'chat.view'))
WITH CHECK (public.has_permission(auth.uid(), 'chat.view'));

DROP POLICY IF EXISTS "Chat staff can create order items" ON public.order_items;
CREATE POLICY "Chat staff can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'chat.view'));

-- Customer segments page is visible to moderators with customer access.
DROP POLICY IF EXISTS "Customer staff can manage segments" ON public.customer_segments;
CREATE POLICY "Customer staff can manage segments"
ON public.customer_segments
FOR ALL
USING (public.has_permission(auth.uid(), 'customers.view'))
WITH CHECK (public.has_permission(auth.uid(), 'customers.view'));

DROP POLICY IF EXISTS "Customer staff can manage segment members" ON public.customer_segment_members;
CREATE POLICY "Customer staff can manage segment members"
ON public.customer_segment_members
FOR ALL
USING (public.has_permission(auth.uid(), 'customers.view'))
WITH CHECK (public.has_permission(auth.uid(), 'customers.view'));

-- Reports page: allow read-only access to supporting tables.
DROP POLICY IF EXISTS "Report staff can view categories" ON public.categories;
CREATE POLICY "Report staff can view categories"
ON public.categories
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view variants" ON public.product_variants;
CREATE POLICY "Report staff can view variants"
ON public.product_variants
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));

DROP POLICY IF EXISTS "Report staff can view order items" ON public.order_items;
CREATE POLICY "Report staff can view order items"
ON public.order_items
FOR SELECT
USING (public.has_permission(auth.uid(), 'reports.view'));
