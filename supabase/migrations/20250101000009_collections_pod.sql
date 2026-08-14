-- =============================================================================
-- Migration 9: to_pay_collections + proof_of_deliveries
-- =============================================================================

-- =============================================================================
-- to_pay_collections table
-- =============================================================================
CREATE TABLE public.to_pay_collections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lr_id                 uuid NOT NULL REFERENCES public.lorry_receipts(id) ON DELETE CASCADE,
  collected             boolean NOT NULL DEFAULT false,
  amount_collected      bigint NOT NULL DEFAULT 0, -- In paise
  collected_by          text, -- Name of person who collected
  collected_at          timestamptz DEFAULT now(),
  payment_mode          text NOT NULL DEFAULT 'CASH'
                        CHECK (payment_mode IN ('CASH', 'UPI', 'BANK_TRANSFER')),
  notes                 text,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.to_pay_collections ENABLE ROW LEVEL SECURITY;

-- Tenant members can read collections
CREATE POLICY "tenant_select_collections" ON public.to_pay_collections
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Fleet owners and hub managers can insert collections
CREATE POLICY "tenant_insert_collections" ON public.to_pay_collections
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Fleet owners and hub managers can update collections
CREATE POLICY "tenant_update_collections" ON public.to_pay_collections
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Indexes
CREATE INDEX idx_collections_lr ON public.to_pay_collections(lr_id);
CREATE INDEX idx_collections_tenant ON public.to_pay_collections(tenant_id);
CREATE INDEX idx_collections_uncollected ON public.to_pay_collections(tenant_id, collected)
  WHERE NOT collected;

-- =============================================================================
-- proof_of_deliveries table
-- =============================================================================
CREATE TABLE public.proof_of_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lr_id           uuid NOT NULL REFERENCES public.lorry_receipts(id) ON DELETE CASCADE,
  receiver_name   text NOT NULL,
  delivered_at    timestamptz NOT NULL DEFAULT now(),
  photo_url       text, -- Nullable; photo upload deferred to v2 Flutter app
  notes           text,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proof_of_deliveries ENABLE ROW LEVEL SECURITY;

-- Tenant members can read PODs
CREATE POLICY "tenant_select_pod" ON public.proof_of_deliveries
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Fleet owners and hub managers can insert PODs
CREATE POLICY "tenant_insert_pod" ON public.proof_of_deliveries
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- PODs are immutable after creation (no UPDATE policy)

-- Indexes
CREATE INDEX idx_pod_lr ON public.proof_of_deliveries(lr_id);
CREATE INDEX idx_pod_tenant ON public.proof_of_deliveries(tenant_id);
