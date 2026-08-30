-- =============================================================================
-- Migration: 20250101000014_hub_manager_settle_permission.sql
-- Description: Allow Hub Managers to insert trip settlements upon truck arrival
--              and update trip expense settlement links.
-- =============================================================================

-- 1. Update insert policy for trip_expense_settlements to allow hub_manager role
DROP POLICY IF EXISTS "fleet_owner_insert_trip_expense_settlements" ON public.trip_expense_settlements;

CREATE POLICY "tenant_insert_trip_expense_settlements" ON public.trip_expense_settlements
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('fleet_owner', 'hub_manager')
  );

-- 2. Update trip_expenses UPDATE policy to allow hub managers to link settlement_id on settlement
DROP POLICY IF EXISTS "tenant_update_trip_expenses" ON public.trip_expenses;

CREATE POLICY "tenant_update_trip_expenses" ON public.trip_expenses
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR (
        current_user_role() = 'hub_manager'
        AND (entered_by = auth.uid() OR settlement_id IS NULL)
      )
    )
  );
