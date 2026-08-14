-- =============================================================================
-- Migration 1: tenants table & standard schema grants
-- =============================================================================

-- Grant schema access
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Set default privileges for all current and future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- tenants table
-- =============================================================================
CREATE TABLE public.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  gstin       text,
  contact_phone text,
  address_line1 text,
  city        text,
  state       text,
  pin_code    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Grant table privileges (RLS policies govern row-level access)
GRANT ALL ON TABLE public.tenants TO postgres, anon, authenticated, service_role;

-- Index for slug lookups (used by customer booking form)
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- NOTE: RLS policies for tenants will be added in migration 2
-- after the users table and helper functions are created.
