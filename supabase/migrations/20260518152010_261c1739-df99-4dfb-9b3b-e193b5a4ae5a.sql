
REVOKE EXECUTE ON FUNCTION public.list_ai_providers() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ai_providers_for_scope(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_providers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_providers_for_scope(text) TO service_role;
