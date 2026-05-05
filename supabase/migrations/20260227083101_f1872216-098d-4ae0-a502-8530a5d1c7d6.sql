-- Add image_url column to product_variants for color-specific images
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url text;