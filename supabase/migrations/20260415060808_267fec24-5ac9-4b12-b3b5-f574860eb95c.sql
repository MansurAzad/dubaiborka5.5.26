
-- Attach stock deduction trigger on order_items insert
CREATE TRIGGER trigger_deduct_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order();

-- Attach order rate limit trigger on orders insert
CREATE TRIGGER trigger_check_order_rate_limit
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_rate_limit();

-- Attach stock restore trigger on orders update (cancel)
CREATE TRIGGER trigger_restore_stock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_cancel();

-- Insert exit_intent_popup into site_content if missing
INSERT INTO public.site_content (section_key, title, subtitle, content, is_active, display_order)
SELECT 'exit_intent_popup', 'একটু দাঁড়ান!', 'আপনার জন্য বিশেষ অফার', 'এখনই অর্ডার করুন এবং বিশেষ ছাড় পান!', true, 99
WHERE NOT EXISTS (SELECT 1 FROM public.site_content WHERE section_key = 'exit_intent_popup');
