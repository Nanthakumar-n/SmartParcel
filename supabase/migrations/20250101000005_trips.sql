-- =============================================================================
-- Migration 5: trip_schedules + trips
-- =============================================================================

-- =============================================================================
-- trip_schedules table (recurring route definitions)
-- =============================================================================
CREATE TABLE public.trip_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_hub_id     uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  to_hub_id       uuid NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  days_of_week    integer[] NOT NULL DEFAULT '{}', -- 0=Sun, 1=Mon, ..., 6=Sat
  departure_time  time,
  vehicle_id      uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id       uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_hubs CHECK (from_hub_id != to_hub_id)
);

-- Enable RLS
ALTER TABLE public.trip_schedules ENABLE ROW LEVEL SECURITY;

-- All tenant members can see trip schedules
CREATE POLICY "tenant_select_trip_schedules" ON public.trip_schedules
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only fleet_owner can manage trip schedules
CREATE POLICY "fleet_owner_insert_trip_schedules" ON public.trip_schedules
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_update_trip_schedules" ON public.trip_schedules
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

CREATE POLICY "fleet_owner_delete_trip_schedules" ON public.trip_schedules
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Indexes
CREATE INDEX idx_trip_schedules_tenant ON public.trip_schedules(tenant_id);
CREATE INDEX idx_trip_schedules_route ON public.trip_schedules(from_hub_id, to_hub_id);

-- =============================================================================
-- trips table (actual trip instances)
-- =============================================================================
CREATE TABLE public.trips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_hub_id         uuid NOT NULL REFERENCES public.hubs(id) ON DELETE RESTRICT,
  to_hub_id           uuid NOT NULL REFERENCES public.hubs(id) ON DELETE RESTRICT,
  vehicle_id          uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id           uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  schedule_id         uuid REFERENCES public.trip_schedules(id) ON DELETE SET NULL,
  scheduled_departure timestamptz,
  dispatched_at       timestamptz,
  completed_at        timestamptz,
  status              text NOT NULL DEFAULT 'SCHEDULED'
                      CHECK (status IN ('SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
  notes               text,
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_different_hubs CHECK (from_hub_id != to_hub_id)
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- All tenant members can see trips
CREATE POLICY "tenant_select_trips" ON public.trips
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Fleet owners and hub managers can create trips
CREATE POLICY "tenant_insert_trips" ON public.trips
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Fleet owners and hub managers can update trips
CREATE POLICY "tenant_update_trips" ON public.trips
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Only fleet_owner can delete trips
CREATE POLICY "fleet_owner_delete_trips" ON public.trips
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Indexes
CREATE INDEX idx_trips_tenant ON public.trips(tenant_id);
CREATE INDEX idx_trips_status ON public.trips(tenant_id, status);
CREATE INDEX idx_trips_route ON public.trips(from_hub_id, to_hub_id);
CREATE INDEX idx_trips_schedule ON public.trips(schedule_id);
