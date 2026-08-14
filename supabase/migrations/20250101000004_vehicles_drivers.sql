-- =============================================================================
-- Migration 4: vehicles + drivers
-- =============================================================================

-- =============================================================================
-- drivers table (web records only in v1; no login)
-- =============================================================================
CREATE TABLE public.drivers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL,
  phone           text NOT NULL,
  license_number  text,
  is_active       boolean NOT NULL DEFAULT true,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- All tenant members can see drivers
CREATE POLICY "tenant_select_drivers" ON public.drivers
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only fleet_owner can manage drivers
CREATE POLICY "fleet_owner_insert_drivers" ON public.drivers
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_update_drivers" ON public.drivers
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_drivers" ON public.drivers
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Indexes
CREATE INDEX idx_drivers_tenant ON public.drivers(tenant_id);

-- =============================================================================
-- vehicles table
-- =============================================================================
CREATE TABLE public.vehicles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number   text NOT NULL,
  vehicle_type          text NOT NULL CHECK (vehicle_type IN ('TRUCK', 'MINI_TRUCK', 'TEMPO')),
  capacity_tonnes       decimal(6, 2),
  default_driver_id     uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE', 'IN_TRANSIT', 'UNDER_MAINTENANCE')),
  is_active             boolean NOT NULL DEFAULT true,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, registration_number)
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- All tenant members can see vehicles
CREATE POLICY "tenant_select_vehicles" ON public.vehicles
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only fleet_owner can manage vehicles
CREATE POLICY "fleet_owner_insert_vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_update_vehicles" ON public.vehicles
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_vehicles" ON public.vehicles
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Indexes
CREATE INDEX idx_vehicles_tenant ON public.vehicles(tenant_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(tenant_id, status);
