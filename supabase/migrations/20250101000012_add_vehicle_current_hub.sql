-- =============================================================================
-- Migration: Add current_hub_id to vehicles table
-- Allows tracking the stationed branch/hub of a vehicle, which updates automatically
-- upon trip completion or can be assigned upon vehicle registration.
-- =============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS current_hub_id uuid REFERENCES public.hubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_current_hub
  ON public.vehicles(tenant_id, current_hub_id);
