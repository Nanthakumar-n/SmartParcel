-- =============================================================================
-- Migration 6: booking_requests + anonymous RLS
-- =============================================================================

CREATE TABLE public.booking_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_slug       text NOT NULL, -- Denormalized for anon RLS policy
  -- Customer details (no login required)
  customer_name     text NOT NULL,
  customer_phone    text NOT NULL,
  -- Shipment details
  origin_city       text NOT NULL,
  destination_city  text NOT NULL,
  goods_description text NOT NULL,
  quantity          integer NOT NULL DEFAULT 1,
  weight_kg         decimal(10, 2),
  num_packages      integer DEFAULT 1,
  -- Processing
  status            text NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  booking_ref       text NOT NULL UNIQUE, -- Public reference number for customer
  assigned_hub_id   uuid REFERENCES public.hubs(id) ON DELETE SET NULL,
  lr_id             uuid, -- FK added in migration 7 after lorry_receipts table
  processed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at      timestamptz,
  rejection_reason  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT booking requests (customer booking form)
-- tenant_id must match the tenant found by slug
CREATE POLICY "anon_insert_booking_request" ON public.booking_requests
  FOR INSERT TO anon
  WITH CHECK (
    tenant_id = (SELECT id FROM public.tenants WHERE slug = tenant_slug)
  );

-- Authenticated tenant members can SELECT booking requests
CREATE POLICY "tenant_select_booking_requests" ON public.booking_requests
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Fleet owners and hub managers can UPDATE (accept/reject)
CREATE POLICY "tenant_update_booking_requests" ON public.booking_requests
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Indexes
CREATE INDEX idx_booking_requests_tenant ON public.booking_requests(tenant_id);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(tenant_id, status);
CREATE INDEX idx_booking_requests_ref ON public.booking_requests(booking_ref);

-- =============================================================================
-- Function to generate a booking reference number
-- Format: BK-{random 8 chars uppercase}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_ref text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate random alphanumeric reference
    v_ref := 'BK-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));

    -- Check uniqueness
    SELECT EXISTS(SELECT 1 FROM public.booking_requests WHERE booking_ref = v_ref)
    INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_ref;
END;
$$;

-- Trigger to auto-generate booking_ref on INSERT
CREATE OR REPLACE FUNCTION public.set_booking_ref()
RETURNS trigger AS $$
BEGIN
  IF NEW.booking_ref IS NULL OR NEW.booking_ref = '' THEN
    NEW.booking_ref := public.generate_booking_ref();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_booking_ref
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_ref();
