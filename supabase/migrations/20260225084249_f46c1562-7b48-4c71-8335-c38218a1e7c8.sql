
-- Function to auto-deduct stock when order items are inserted
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct from main products table
  UPDATE public.products
  SET stock = GREATEST(COALESCE(stock, 0) - NEW.quantity, 0)
  WHERE id = NEW.product_id;

  -- Deduct from product_variants if size/color specified
  IF NEW.size IS NOT NULL OR NEW.color IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock = GREATEST(stock - NEW.quantity, 0)
    WHERE product_id = NEW.product_id
      AND (NEW.size IS NULL OR size = NEW.size)
      AND (NEW.color IS NULL OR color = NEW.color);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on order_items insert
CREATE TRIGGER trigger_deduct_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order();

-- Function to restore stock on order cancellation
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Restore stock for each order item
    UPDATE public.products p
    SET stock = COALESCE(p.stock, 0) + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND p.id = oi.product_id;

    -- Restore variant stock
    UPDATE public.product_variants pv
    SET stock = pv.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND pv.product_id = oi.product_id
      AND (oi.size IS NULL OR pv.size = oi.size)
      AND (oi.color IS NULL OR pv.color = oi.color);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on order status change to cancelled
CREATE TRIGGER trigger_restore_stock_on_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_cancel();
