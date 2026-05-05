
-- Newsletter subscribers table for email campaigns
CREATE TABLE public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  subscribed boolean NOT NULL DEFAULT true,
  source text DEFAULT 'website',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
FOR INSERT WITH CHECK (true);

-- Only admins can view all subscribers
CREATE POLICY "Admins can view subscribers" ON public.newsletter_subscribers
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage subscribers
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  sent_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bundle deals table
CREATE TABLE public.bundle_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  discount_percent numeric NOT NULL DEFAULT 15,
  min_items integer NOT NULL DEFAULT 2,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bundle_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active bundles" ON public.bundle_deals
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bundles" ON public.bundle_deals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
