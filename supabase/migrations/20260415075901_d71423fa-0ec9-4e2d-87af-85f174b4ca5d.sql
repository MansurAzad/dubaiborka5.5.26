
-- Secure function to look up orders by phone or ID (for order tracking)
-- Uses SECURITY DEFINER to bypass RLS, but only returns limited safe fields
CREATE OR REPLACE FUNCTION public.track_order_by_phone(phone_number text)
RETURNS TABLE (
  id uuid,
  status text,
  total numeric,
  created_at timestamptz,
  updated_at timestamptz,
  shipping_address text,
  shipping_city text,
  shipping_phone text,
  tracking_number text,
  courier_name text,
  estimated_delivery timestamptz,
  payment_method text,
  payment_status text,
  discount_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.status, o.total, o.created_at, o.updated_at,
         o.shipping_address, o.shipping_city, o.shipping_phone,
         o.tracking_number, o.courier_name, o.estimated_delivery,
         o.payment_method, o.payment_status, o.discount_amount
  FROM public.orders o
  WHERE o.shipping_phone = phone_number
  ORDER BY o.created_at DESC
  LIMIT 10;
$$;

-- Secure function to look up a single order by ID (for tracking)
CREATE OR REPLACE FUNCTION public.track_order_by_id(order_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  total numeric,
  created_at timestamptz,
  updated_at timestamptz,
  shipping_address text,
  shipping_city text,
  shipping_phone text,
  tracking_number text,
  courier_name text,
  estimated_delivery timestamptz,
  payment_method text,
  payment_status text,
  discount_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.status, o.total, o.created_at, o.updated_at,
         o.shipping_address, o.shipping_city, o.shipping_phone,
         o.tracking_number, o.courier_name, o.estimated_delivery,
         o.payment_method, o.payment_status, o.discount_amount
  FROM public.orders o
  WHERE o.id = order_id
  LIMIT 1;
$$;

-- Secure function to get order items by order_id (bypasses RLS for tracking)
CREATE OR REPLACE FUNCTION public.track_order_items(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  product_name text,
  quantity integer,
  price numeric,
  size text,
  color text,
  product_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.id, oi.product_name, oi.quantity, oi.price, oi.size, oi.color, oi.product_id
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;
$$;
