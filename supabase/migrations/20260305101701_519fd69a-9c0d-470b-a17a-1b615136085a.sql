
CREATE TABLE public.social_proof_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  product_name text NOT NULL,
  city text NOT NULL DEFAULT 'ঢাকা',
  time_ago text NOT NULL DEFAULT 'কিছুক্ষণ আগে',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.social_proof_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social proof messages" ON public.social_proof_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active social proof messages" ON public.social_proof_messages
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
