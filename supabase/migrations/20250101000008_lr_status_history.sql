-- =============================================================================
-- Migration 8: lr_status_history (append-only audit trail)
-- =============================================================================

CREATE TABLE public.lr_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lr_id       uuid NOT NULL REFERENCES public.lorry_receipts(id) ON DELETE CASCADE,
  from_status text, -- NULL for initial creation
  to_status   text NOT NULL,
  changed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  notes       text,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.lr_status_history ENABLE ROW LEVEL SECURITY;

-- Tenant members can READ audit trail
CREATE POLICY "tenant_select_history" ON public.lr_status_history
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Tenant members can APPEND to audit trail
CREATE POLICY "tenant_insert_history" ON public.lr_status_history
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- ⚠️ EXPLICITLY NO UPDATE OR DELETE POLICIES
-- The audit trail is immutable — no updates or deletes allowed via RLS

-- Indexes
CREATE INDEX idx_lr_history_lr ON public.lr_status_history(lr_id);
CREATE INDEX idx_lr_history_tenant ON public.lr_status_history(tenant_id);
CREATE INDEX idx_lr_history_changed_at ON public.lr_status_history(changed_at DESC);
