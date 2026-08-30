-- =============================================================================
-- Migration 13: trip_expenses + trip_expense_settlements (Phase 1.5)
-- =============================================================================

-- =============================================================================
-- trip_expenses table
-- Positive amounts = advance given to driver (cash in driver's hand)
-- Negative amounts = road expenses incurred by driver (diesel, toll, etc.)
-- =============================================================================
CREATE TABLE public.trip_expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id       uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN ('ADVANCE', 'FUEL', 'TOLL', 'MAINTENANCE', 'BHATTA', 'LABOUR', 'MISC')),
  amount          bigint NOT NULL, -- in paise: positive for ADVANCE, negative for road expenses
  description     text,
  is_voided       boolean NOT NULL DEFAULT false,
  voided_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  voided_at       timestamptz,
  entered_by      uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  entered_at      timestamptz NOT NULL DEFAULT now(),
  settlement_id   uuid, -- linked to trip_expense_settlements once settled
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- trip_expense_settlements table
-- One settlement record per trip when trip is settled by Fleet Owner
-- =============================================================================
CREATE TABLE public.trip_expense_settlements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  net_balance     bigint NOT NULL, -- in paise. Positive = driver owes company, Negative = company owes driver
  settlement_mode text NOT NULL DEFAULT 'CASH' CHECK (settlement_mode IN ('CASH', 'UPI', 'BANK_TRANSFER')),
  settled_by      uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  settled_at      timestamptz NOT NULL DEFAULT now(),
  notes           text,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_expense_settlements ENABLE ROW LEVEL SECURITY;

-- Foreign key linking trip_expenses to trip_expense_settlements
ALTER TABLE public.trip_expenses
  ADD CONSTRAINT fk_trip_expenses_settlement
  FOREIGN KEY (settlement_id) REFERENCES public.trip_expense_settlements(id)
  ON DELETE SET NULL;

-- =============================================================================
-- RLS Policies for trip_expenses
-- =============================================================================

-- All tenant members can view trip expenses
CREATE POLICY "tenant_select_trip_expenses" ON public.trip_expenses
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Fleet owners and hub managers can add expense entries
CREATE POLICY "tenant_insert_trip_expenses" ON public.trip_expenses
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- Fleet owners can void any expense or link settlement. Hub managers can void their own entries.
CREATE POLICY "tenant_update_trip_expenses" ON public.trip_expenses
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR (
        current_user_role() = 'hub_manager'
        AND entered_by = auth.uid()
      )
    )
  );

-- Direct DELETE is denied for all roles (immutable ledger; use voiding pattern)

-- =============================================================================
-- RLS Policies for trip_expense_settlements
-- =============================================================================

-- All tenant members can view settlements
CREATE POLICY "tenant_select_trip_expense_settlements" ON public.trip_expense_settlements
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Only Fleet Owners can create settlements
CREATE POLICY "fleet_owner_insert_trip_expense_settlements" ON public.trip_expense_settlements
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- Only Fleet Owners can delete settlements (re-open a settled trip)
CREATE POLICY "fleet_owner_delete_trip_expense_settlements" ON public.trip_expense_settlements
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'fleet_owner'
  );

-- UPDATE is denied (Fleet Owner deletes and re-settles to amend)

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX idx_trip_expenses_trip ON public.trip_expenses(trip_id);
CREATE INDEX idx_trip_expenses_tenant ON public.trip_expenses(tenant_id);
CREATE INDEX idx_trip_expenses_driver ON public.trip_expenses(driver_id);
CREATE INDEX idx_trip_expenses_settlement ON public.trip_expenses(settlement_id);
CREATE INDEX idx_trip_expenses_voided ON public.trip_expenses(is_voided);

CREATE INDEX idx_trip_settlements_trip ON public.trip_expense_settlements(trip_id);
CREATE INDEX idx_trip_settlements_tenant ON public.trip_expense_settlements(tenant_id);
