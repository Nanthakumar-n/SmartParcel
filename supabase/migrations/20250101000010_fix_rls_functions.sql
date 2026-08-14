-- =============================================================================
-- Migration 10: Fix RLS helper functions with SECURITY DEFINER to prevent infinite recursion
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid,
    (auth.jwt() ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_role'),
    (auth.jwt() ->> 'user_role'),
    (SELECT user_role FROM public.users WHERE id = auth.uid())
  )::text
$$;

CREATE OR REPLACE FUNCTION public.current_user_hub_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(SELECT hub_id FROM public.user_hub_assignments WHERE user_id = auth.uid()),
    '{}'::uuid[]
  )
$$;
