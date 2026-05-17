
-- Custom AI provider settings (OpenAI-compatible) for customer chatbot & admin agent
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('customer','admin')),
  provider_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  extra_headers JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_scope_active ON public.ai_provider_settings(scope, is_active);

-- Only one active per scope
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_provider_one_active_per_scope
  ON public.ai_provider_settings(scope) WHERE is_active = true;

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai providers"
  ON public.ai_provider_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_provider_settings_updated
  BEFORE UPDATE ON public.ai_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper for edge functions: returns active provider for a scope (security definer so edge
-- function with service-role still works; also lets us hide row from non-admins by default).
CREATE OR REPLACE FUNCTION public.get_active_ai_provider(_scope TEXT)
RETURNS TABLE(provider_name TEXT, base_url TEXT, api_key TEXT, model TEXT, extra_headers JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider_name, base_url, api_key, model, extra_headers
  FROM public.ai_provider_settings
  WHERE scope = _scope AND is_active = true
  LIMIT 1;
$$;
