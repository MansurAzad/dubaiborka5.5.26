
-- Update slug generator to support Bengali/Unicode characters
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Keep Bengali (Unicode), alphanumeric, spaces and hyphens
    base_slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[^\w\s\-\u0980-\u09FF]', '', 'g'),
      '\s+', '-', 'g'
    ));
    -- Remove leading/trailing hyphens
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    -- Fallback if empty
    IF base_slug = '' THEN
      base_slug := 'product';
    END IF;
    final_slug := base_slug;
    
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug AND id != NEW.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;
