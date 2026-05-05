
-- Add display_order column to site_content
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Delete existing site_content rows to re-seed with full homepage sections
DELETE FROM public.site_content;

-- Seed all homepage sections with proper order
INSERT INTO public.site_content (section_key, title, subtitle, content, is_active, display_order) VALUES
  ('announcement_bar', 'Announcement Bar', '🎉 ৳৫,০০০+ অর্ডারে ফ্রি শিপিং!', 'কোড ব্যবহার করুন: DUBAI10 — ১০% ছাড়!', true, 1),
  ('hero_banner', 'Hero Banner', 'Elegance Imported from Dubai', 'Discover premium abayas, borkas, and fabrics crafted with the finest materials from Dubai.', true, 2),
  ('flash_sale', 'Flash Sale Timer', '⚡ Flash Sale!', 'সীমিত সময়ের জন্য ৩০% পর্যন্ত ছাড়!', true, 3),
  ('featured_categories', 'Featured Categories', 'Browse By Category', 'Our Collections', true, 4),
  ('featured_products', 'Featured Products', 'Handpicked For You', 'Featured Products', true, 5),
  ('special_offer', 'Special Offer', 'Limited Time Offer', 'Up to 40% Off on Premium Kaftans', true, 6),
  ('bundle_deals', 'Bundle Deals', 'Bundle Offers', 'একসাথে কিনলে বেশি সেভ!', true, 7),
  ('about_section', 'About Us', 'About Us', 'Where Dubai Luxury Meets Bangladeshi Elegance', true, 8),
  ('why_choose_us', 'Why Choose Us', 'Why Choose Us', 'The Dubai Borka House Difference', true, 9),
  ('testimonials', 'Testimonials', 'Customer Love', 'What Our Customers Say', true, 10),
  ('instagram_feed', 'Instagram Feed', 'Follow Us On Instagram', '@DubaiBorkaHouse', true, 11),
  ('newsletter', 'Newsletter', 'Get 15% Off Your First Order', 'Subscribe to our newsletter for exclusive offers.', true, 12);
