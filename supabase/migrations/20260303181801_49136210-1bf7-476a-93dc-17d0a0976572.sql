
-- Create categories table for dynamic category management
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text,
  slug text UNIQUE,
  description text,
  description_bn text,
  image_url text,
  item_count text DEFAULT '0+ Items',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, name_bn, slug, description, description_bn, image_url, item_count, display_order) VALUES
('borka', 'বোরকা', 'borka', 'Premium borka collection from Dubai', 'দুবাই থেকে আমদানিকৃত প্রিমিয়াম বোরকা কালেকশন', '/products/product-borka-embroidery.jpg', '50+ Items', 1),
('abaya', 'আবায়া', 'abaya', 'Elegant Dubai-style abayas with intricate embroidery', 'মার্জিত দুবাই স্টাইল আবায়া এমব্রয়ডারিসহ', '/products/product-abaya-black.jpg', '40+ Items', 2),
('hijab', 'হিজাব', 'hijab', 'Premium silk and cotton hijabs in stunning colors', 'প্রিমিয়াম সিল্ক ও কটন হিজাব সুন্দর রঙে', '/products/product-hijab-chiffon.jpg', '200+ Items', 3),
('kaftan', 'কাফতান', 'kaftan', 'Ornate Arabian kaftans for special occasions', 'বিশেষ অনুষ্ঠানের জন্য আরবীয় কাফতান', '/products/product-kaftan-gold.jpg', '30+ Items', 4),
('scarf', 'স্কার্ফ', 'scarf', 'Beautiful printed scarves in various styles', 'বিভিন্ন স্টাইলের সুন্দর প্রিন্ট স্কার্ফ', '/products/product-scarf-floral.jpg', '80+ Items', 5),
('fabric', 'ফেব্রিক', 'fabric', 'Luxurious imported fabrics for custom tailoring', 'কাস্টম টেইলরিংয়ের জন্য আমদানিকৃত ফেব্রিক', '/products/product-fabric-nida.jpg', '100+ Items', 6);
