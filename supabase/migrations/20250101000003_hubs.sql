-- =============================================================================
-- Migration 3: hubs + LR sequences
-- =============================================================================

-- =============================================================================
-- hubs table
-- =============================================================================
CREATE TABLE public.hubs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_code      text NOT NULL,
  name          text NOT NULL,
  address_line1 text,
  city          text,
  state         text,
  pin_code      text,
  latitude      decimal(9, 6),
  longitude     decimal(9, 6),
  contact_phone text,
  is_active     boolean NOT NULL DEFAULT true,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, hub_code)
);

-- Enable RLS
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

-- All tenant members can see hubs
CREATE POLICY "tenant_select_hubs" ON public.hubs
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only fleet_owner can manage hubs
CREATE POLICY "fleet_owner_insert_hubs" ON public.hubs
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_update_hubs" ON public.hubs
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_hubs" ON public.hubs
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Indexes
CREATE INDEX idx_hubs_tenant ON public.hubs(tenant_id);
CREATE INDEX idx_hubs_code ON public.hubs(tenant_id, hub_code);

-- Add the FK from user_hub_assignments to hubs (deferred from migration 2)
ALTER TABLE public.user_hub_assignments
  ADD CONSTRAINT fk_hub_assignments_hub
  FOREIGN KEY (hub_id) REFERENCES public.hubs(id) ON DELETE CASCADE;

-- =============================================================================
-- LR sequence table (per-hub per-year LR numbering)
-- =============================================================================
CREATE TABLE public.lr_sequences (
  hub_id    uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  year      integer NOT NULL,
  last_seq  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (hub_id, year)
);

-- Enable RLS (but this table is only accessed via trigger/function)
ALTER TABLE public.lr_sequences ENABLE ROW LEVEL SECURITY;

-- Tenant members can view sequences (for debugging)
CREATE POLICY "tenant_select_lr_sequences" ON public.lr_sequences
  FOR SELECT USING (
    hub_id IN (SELECT id FROM public.hubs WHERE tenant_id = current_tenant_id())
  );

-- =============================================================================
-- LR number generation function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_lr_number(p_hub_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hub_code text;
  v_year     integer := EXTRACT(YEAR FROM now())::integer;
  v_seq      integer;
BEGIN
  -- Get hub code
  SELECT hub_code INTO v_hub_code FROM public.hubs WHERE id = p_hub_id;

  IF v_hub_code IS NULL THEN
    RAISE EXCEPTION 'Hub not found: %', p_hub_id;
  END IF;

  -- Atomic upsert: increment sequence or create new for this year
  INSERT INTO public.lr_sequences (hub_id, year, last_seq)
  VALUES (p_hub_id, v_year, 1)
  ON CONFLICT (hub_id, year)
  DO UPDATE SET last_seq = public.lr_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  -- Format: HUB_CODE-YYYY-000001
  RETURN v_hub_code || '-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
END;
$$;
