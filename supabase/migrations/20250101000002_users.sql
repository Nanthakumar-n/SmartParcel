-- =============================================================================
-- Migration 2: users + user_hub_assignments + JWT claims hook + RLS helpers
-- =============================================================================

-- =============================================================================
-- users table (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  phone       text,
  full_name   text NOT NULL,
  user_role   text NOT NULL CHECK (user_role IN ('fleet_owner', 'hub_manager', 'driver')),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_tenant ON public.users(tenant_id);
CREATE INDEX idx_users_role ON public.users(tenant_id, user_role);

-- =============================================================================
-- user_hub_assignments table
-- =============================================================================
CREATE TABLE public.user_hub_assignments (
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hub_id    uuid NOT NULL, -- FK to hubs added in migration 3 after hubs table exists
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hub_id)
);

-- Indexes
CREATE INDEX idx_hub_assignments_user ON public.user_hub_assignments(user_id);
CREATE INDEX idx_hub_assignments_hub ON public.user_hub_assignments(hub_id);

-- =============================================================================
-- RLS Helper Functions (now that users table exists)
-- =============================================================================

-- Helper: get the current user's tenant_id from the users table
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$;

-- Helper: get the current user's role from JWT claims
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_role'),
    (auth.jwt() ->> 'user_role')
  )::text
$$;

-- Helper: get hub IDs assigned to the current user
CREATE OR REPLACE FUNCTION public.current_user_hub_ids()
RETURNS uuid[]
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    ARRAY(SELECT hub_id FROM public.user_hub_assignments WHERE user_id = auth.uid()),
    '{}'::uuid[]
  )
$$;

-- =============================================================================
-- Now add RLS policies for tenants (deferred from migration 1)
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT USING (id = current_tenant_id());

CREATE POLICY "tenant_update_own" ON public.tenants
  FOR UPDATE USING (
    id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- =============================================================================
-- RLS for users table
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can see all users in their tenant
CREATE POLICY "tenant_select_users" ON public.users
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only fleet_owner can insert users (invite)
CREATE POLICY "fleet_owner_insert_users" ON public.users
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Only fleet_owner can update other users
CREATE POLICY "fleet_owner_update_users" ON public.users
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR id = auth.uid() -- Users can update their own profile
    )
  );

-- =============================================================================
-- RLS for user_hub_assignments
-- =============================================================================
ALTER TABLE public.user_hub_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_hub_assignments" ON public.user_hub_assignments
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "fleet_owner_insert_hub_assignments" ON public.user_hub_assignments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_hub_assignments" ON public.user_hub_assignments
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- =============================================================================
-- Custom Access Token Hook: inject user_role and tenant_id into JWT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_user_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_tenant_id uuid;
BEGIN
  SELECT user_role, tenant_id
  INTO v_role, v_tenant_id
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid;

  IF v_role IS NULL THEN
    RETURN event;
  END IF;

  event := jsonb_set(
    event,
    '{claims,app_metadata,user_role}',
    to_jsonb(v_role)
  );
  event := jsonb_set(
    event,
    '{claims,app_metadata,tenant_id}',
    to_jsonb(v_tenant_id::text)
  );

  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for Auth hooks)
GRANT EXECUTE ON FUNCTION public.set_user_claims(jsonb) TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.set_user_claims(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_claims(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_claims(jsonb) FROM authenticated;
