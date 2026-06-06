ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill: ensure any existing image_url is included in image_urls
UPDATE public.product_variants
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url <> '' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);