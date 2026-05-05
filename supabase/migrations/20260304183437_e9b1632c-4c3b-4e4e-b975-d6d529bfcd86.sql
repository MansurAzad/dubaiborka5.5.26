-- Fix section_key mismatches between database and frontend code
UPDATE public.site_content SET section_key = 'announcement_bar' WHERE section_key = 'announcement';
UPDATE public.site_content SET section_key = 'hero_banner' WHERE section_key = 'hero';
UPDATE public.site_content SET section_key = 'about_section' WHERE section_key = 'about';
