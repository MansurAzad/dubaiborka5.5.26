-- Remove overly permissive guest SELECT policy on order_items
DROP POLICY IF EXISTS "Guest users can view order items" ON public.order_items;