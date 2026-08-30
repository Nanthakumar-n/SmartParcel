import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import { UserSession, getUserHubIds } from '@/lib/auth/session';
import { ActionResult, actionSuccess, formError } from '@/lib/types/action-result';
import type {
  TripExpenseCategory,
  SettlementPaymentMode,
} from '@/lib/validations/trip-expense';
import {
  insertTripExpense,
  voidTripExpense,
  getTripExpenseById,
  insertTripSettlement,
  deleteTripSettlement,
  getTripSettlementByTripId,
  getTripExpensesByTripId,
  TripExpenseRow,
  TripExpenseSettlementRow,
} from '@/lib/db/trip-expenses';
import { getTripById } from '@/lib/db/trips';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface AddTripExpenseParams {
  tripId: string;
  category: TripExpenseCategory;
  amountPaise: number; // raw magnitude from form in paise
  description?: string;
}

export interface SettleTripParams {
  tripId: string;
  settlementMode: SettlementPaymentMode;
  notes?: string;
}

/**
 * Service to add a new trip expense entry.
 */
export async function addTripExpenseService(
  supabase: AnySupabaseClient,
  params: AddTripExpenseParams,
  session: UserSession
): Promise<ActionResult<TripExpenseRow>> {
  // 1. Fetch trip to verify existence and permissions
  const trip = await getTripById(supabase, params.tripId);
  if (!trip) {
    return formError('Trip not found.');
  }

  // 2. Role & Hub scoping checks
  if (session.role === 'hub_manager') {
    const userHubIds = await getUserHubIds(session.id);
    if (!userHubIds.includes(trip.from_hub_id)) {
      return formError('Hub Managers can only record expenses for trips originating at their assigned hubs.');
    }
  }

  // 3. Verify trip is not already settled
  const existingSettlement = await getTripSettlementByTripId(supabase, params.tripId);
  if (existingSettlement) {
    return formError(
      'Cannot add expenses to a settled trip. A Fleet Owner must re-open the settlement first.'
    );
  }

  // 4. Calculate signed amount:
  // ADVANCE is positive (cash in driver's hand, owes company)
  // Road expenses are negative (spent on behalf of company)
  const magnitude = Math.abs(params.amountPaise);
  const signedAmount = params.category === 'ADVANCE' ? magnitude : -magnitude;

  // 5. Auto-populate driver_id if assigned on the trip
  const driverId = trip.driver_id ?? null;

  try {
    const createdExpense = await insertTripExpense(supabase, {
      trip_id: params.tripId,
      driver_id: driverId,
      tenant_id: session.tenantId,
      category: params.category,
      amount: signedAmount,
      description: params.description?.trim() || null,
      entered_by: session.id,
    });

    return actionSuccess(createdExpense);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to record expense entry.';
    return formError(errorMsg);
  }
}

/**
 * Service to void an expense entry (immutable soft-void).
 */
export async function voidTripExpenseService(
  supabase: AnySupabaseClient,
  expenseId: string,
  session: UserSession
): Promise<ActionResult<TripExpenseRow>> {
  // 1. Fetch expense details
  const expense = await getTripExpenseById(supabase, expenseId);

  if (!expense) {
    return formError('Expense entry not found.');
  }

  if (expense.is_voided) {
    return formError('This expense entry has already been voided.');
  }

  // 2. Verify trip is not already settled
  const existingSettlement = await getTripSettlementByTripId(supabase, expense.trip_id);
  if (existingSettlement) {
    return formError(
      'Cannot void an expense on a settled trip. A Fleet Owner must re-open the settlement first.'
    );
  }

  // 3. Role-based check: Hub Managers can only void their own entries
  if (session.role === 'hub_manager' && expense.entered_by !== session.id) {
    return formError('Hub Managers can only void entries that they personally recorded.');
  }

  try {
    const voidedExpense = await voidTripExpense(supabase, expenseId, session.id);
    return actionSuccess(voidedExpense);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to void expense entry.';
    return formError(errorMsg);
  }
}

/**
 * Service for Fleet Owner to settle a trip.
 */
export async function settleTripService(
  supabase: AnySupabaseClient,
  params: SettleTripParams,
  session: UserSession
): Promise<ActionResult<TripExpenseSettlementRow>> {
  // 1. Enforce Fleet Owner role
  if (session.role !== 'fleet_owner') {
    return formError('Only Fleet Owners have permission to settle trips.');
  }

  // 2. Fetch trip
  const trip = await getTripById(supabase, params.tripId);
  if (!trip) {
    return formError('Trip not found.');
  }

  // 3. Verify trip is not already settled
  const existingSettlement = await getTripSettlementByTripId(supabase, params.tripId);
  if (existingSettlement) {
    return formError('This trip has already been settled.');
  }

  // 4. Fetch all non-voided expenses to compute net balance
  const expenses = await getTripExpensesByTripId(supabase, params.tripId);
  const activeExpenses = expenses.filter((e) => !e.is_voided);

  // Net balance in paise = sum of signed amounts
  const netBalancePaise = activeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  try {
    const settlement = await insertTripSettlement(supabase, {
      trip_id: params.tripId,
      net_balance: netBalancePaise,
      settlement_mode: params.settlementMode,
      settled_by: session.id,
      notes: params.notes?.trim() || null,
      tenant_id: session.tenantId,
    });

    return actionSuccess(settlement);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to settle trip.';
    return formError(errorMsg);
  }
}

/**
 * Service for Fleet Owner to re-open a settled trip.
 */
export async function reopenSettlementService(
  supabase: AnySupabaseClient,
  tripId: string,
  session: UserSession
): Promise<ActionResult<void>> {
  // 1. Enforce Fleet Owner role
  if (session.role !== 'fleet_owner') {
    return formError('Only Fleet Owners have permission to re-open settlements.');
  }

  // 2. Check if settlement exists
  const existingSettlement = await getTripSettlementByTripId(supabase, tripId);
  if (!existingSettlement) {
    return formError('This trip is not currently settled.');
  }

  try {
    await deleteTripSettlement(supabase, tripId);
    return actionSuccess(undefined);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to re-open trip settlement.';
    return formError(errorMsg);
  }
}
