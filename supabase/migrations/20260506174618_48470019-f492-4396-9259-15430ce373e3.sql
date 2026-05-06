CREATE TABLE IF NOT EXISTS public.ai_usage_counter (
  month text PRIMARY KEY,
  used_count integer NOT NULL DEFAULT 0,
  monthly_limit integer NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai usage"
  ON public.ai_usage_counter FOR SELECT
  USING (true);

CREATE POLICY "Admins can update limit"
  ON public.ai_usage_counter FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert"
  ON public.ai_usage_counter FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_ai_usage()
RETURNS TABLE(month text, used_count integer, monthly_limit integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT month, used_count, monthly_limit
  FROM public.ai_usage_counter
  WHERE month = to_char(now(), 'YYYY-MM')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cur_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.ai_usage_counter (month, used_count)
  VALUES (cur_month, 1)
  ON CONFLICT (month)
  DO UPDATE SET used_count = ai_usage_counter.used_count + 1, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_usage() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage() TO service_role;