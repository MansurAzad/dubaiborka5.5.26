
ALTER TABLE public.ai_provider_settings
  ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT,
  ADD COLUMN IF NOT EXISTS last_test_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS last_test_error TEXT,
  ADD COLUMN IF NOT EXISTS last_test_sample TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_provider_scope_priority
  ON public.ai_provider_settings(scope, is_active DESC, is_fallback DESC, priority ASC);

-- Masked listing for admin UI (full api_key never leaves DB)
CREATE OR REPLACE FUNCTION public.list_ai_providers()
RETURNS TABLE(
  id uuid, scope text, provider_name text, base_url text, api_key_masked text,
  model text, is_active boolean, is_fallback boolean, priority int, notes text,
  extra_headers jsonb,
  last_test_at timestamptz, last_test_status text, last_test_latency_ms int,
  last_test_error text, last_test_sample text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, scope, provider_name, base_url,
    CASE
      WHEN api_key IS NULL OR length(api_key) = 0 THEN ''
      WHEN length(api_key) > 8 THEN '••••' || right(api_key, 4)
      ELSE '••••'
    END AS api_key_masked,
    model, is_active, is_fallback, priority, notes, extra_headers,
    last_test_at, last_test_status, last_test_latency_ms, last_test_error, last_test_sample,
    created_at, updated_at
  FROM public.ai_provider_settings
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY scope, is_active DESC, is_fallback DESC, priority ASC, created_at DESC;
$$;

-- Used by edge functions: active first, then fallbacks in priority order
CREATE OR REPLACE FUNCTION public.get_ai_providers_for_scope(_scope text)
RETURNS TABLE(
  id uuid, provider_name text, base_url text, api_key text, model text,
  extra_headers jsonb, is_active boolean, is_fallback boolean, priority int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, provider_name, base_url, api_key, model, extra_headers,
         is_active, is_fallback, priority
  FROM public.ai_provider_settings
  WHERE scope = _scope AND (is_active = true OR is_fallback = true)
  ORDER BY is_active DESC, is_fallback DESC, priority ASC, created_at ASC;
$$;
