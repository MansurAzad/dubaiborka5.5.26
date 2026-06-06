
DROP FUNCTION IF EXISTS public.list_ai_providers();
DROP FUNCTION IF EXISTS public.get_ai_providers_for_scope(text);

CREATE OR REPLACE FUNCTION public.list_ai_providers()
RETURNS TABLE (
  id uuid,
  scope text,
  provider_name text,
  base_url text,
  api_key_masked text,
  model text,
  extra_headers jsonb,
  is_active boolean,
  is_fallback boolean,
  priority integer,
  notes text,
  last_test_at timestamptz,
  last_test_status text,
  last_test_latency_ms integer,
  last_test_error text,
  last_test_sample text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.scope, s.provider_name, s.base_url,
    CASE
      WHEN s.api_key IS NULL OR length(s.api_key) = 0 THEN ''
      WHEN length(s.api_key) <= 4 THEN '••••'
      ELSE '••••' || right(s.api_key, 4)
    END AS api_key_masked,
    s.model, s.extra_headers, s.is_active, s.is_fallback, s.priority, s.notes,
    s.last_test_at, s.last_test_status, s.last_test_latency_ms, s.last_test_error, s.last_test_sample
  FROM public.ai_provider_settings s
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY s.scope, s.is_active DESC, s.priority ASC, s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_ai_providers() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_providers() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ai_providers_for_scope(_scope text)
RETURNS TABLE (
  provider_name text,
  base_url text,
  api_key text,
  model text,
  extra_headers jsonb,
  is_active boolean,
  is_fallback boolean,
  priority integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.provider_name, s.base_url, s.api_key, s.model, s.extra_headers,
         s.is_active, s.is_fallback, s.priority
  FROM public.ai_provider_settings s
  WHERE s.scope = _scope
    AND (s.is_active OR s.is_fallback)
  ORDER BY s.is_active DESC, s.priority ASC, s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_ai_providers_for_scope(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_providers_for_scope(text) TO service_role;
