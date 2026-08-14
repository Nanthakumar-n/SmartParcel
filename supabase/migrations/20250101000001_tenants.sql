-- =============================================================================
-- Migration 1: tenants table
-- =============================================================================

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

-- Index for slug lookups (used by customer booking form)
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- NOTE: RLS policies for tenants will be added in migration 2
-- after the users table and helper functions are created.
