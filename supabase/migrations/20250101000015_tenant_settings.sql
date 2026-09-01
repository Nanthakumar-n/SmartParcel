-- =============================================================================
-- Migration: 20250101000015_tenant_settings.sql
-- Description: Create tenant_settings and whatsapp_notifications_log tables
--              with RLS policies and idempotency indexes.
-- =============================================================================

-- 1. Create tenant_settings table
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lr_terms_and_conditions text DEFAULT '1. Goods are carried at owner risk.
2. The company is not liable for leakage, breakage, or transit delays due to unavoidable circumstances.
3. All disputes are subject to local jurisdiction.',
  lr_default_remarks      text,
  whatsapp_enabled        boolean NOT NULL DEFAULT false,
  wati_api_endpoint       text,
  wati_api_token          text,
  notification_preferences jsonb NOT NULL DEFAULT '{"BOOKED": true, "IN_TRANSIT": true, "ARRIVED": true, "OUT_FOR_DELIVERY": true, "DELIVERED": true, "PAYMENT_REMINDER": true}'::jsonb,
  payment_reminder_days   integer NOT NULL DEFAULT 3,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_settings_tenant_id_key UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.tenant_settings TO postgres, anon, authenticated, service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);

-- RLS Policies for tenant_settings
CREATE POLICY "tenant_select_tenant_settings" ON public.tenant_settings
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

CREATE POLICY "fleet_owner_insert_tenant_settings" ON public.tenant_settings
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_update_tenant_settings" ON public.tenant_settings
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_tenant_settings" ON public.tenant_settings
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- 2. Create whatsapp_notifications_log table
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lr_id             uuid REFERENCES public.lorry_receipts(id) ON DELETE SET NULL,
  event_type        text NOT NULL,
  recipient_phone   text NOT NULL,
  wati_message_id   text,
  status            text NOT NULL CHECK (status IN ('SENT', 'FAILED', 'PENDING')),
  reminder_sequence integer,
  error_message     text,
  sent_at           timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_notifications_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.whatsapp_notifications_log TO postgres, anon, authenticated, service_role;

-- Indexes & Idempotency Constraints
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_tenant_id ON public.whatsapp_notifications_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_lr_id ON public.whatsapp_notifications_log(lr_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_sent_at ON public.whatsapp_notifications_log(sent_at DESC);

-- Partial unique index for one-time triggers (reminder_sequence IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_log_one_time 
  ON public.whatsapp_notifications_log(lr_id, event_type) 
  WHERE reminder_sequence IS NULL;

-- Unique index for recurring reminders (reminder_sequence IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_log_recurring 
  ON public.whatsapp_notifications_log(lr_id, event_type, reminder_sequence) 
  WHERE reminder_sequence IS NOT NULL;

-- RLS Policies for whatsapp_notifications_log
CREATE POLICY "tenant_select_whatsapp_log" ON public.whatsapp_notifications_log
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

CREATE POLICY "tenant_insert_whatsapp_log" ON public.whatsapp_notifications_log
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
  );
