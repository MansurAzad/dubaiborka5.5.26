
CREATE INDEX IF NOT EXISTS idx_categories_active_order ON public.categories (is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_active_created ON public.coupons (is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_social_proof_active_order ON public.social_proof_messages (is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_site_content_active_order ON public.site_content (is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_site_content_section_active ON public.site_content (section_key, is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured, created_at DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_sale_created ON public.products (created_at DESC) WHERE sale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings (key);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON public.product_images (product_id, display_order);
