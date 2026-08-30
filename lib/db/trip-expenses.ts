import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { TripExpenseCategory, SettlementPaymentMode } from '@/lib/validations/trip-expense';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export type TripExpenseRow = Database['public']['Tables']['trip_expenses']['Row'];
export type TripExpenseSettlementRow = Database['public']['Tables']['trip_expense_settlements']['Row'];

export interface TripExpenseWithUsers extends TripExpenseRow {
  entered_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  voided_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  driver?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
}

export interface TripSettlementWithUser extends TripExpenseSettlementRow {
  settled_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface TripWithExpenseLedger {
  id: string;
  from_hub: {
    id: string;
    name: string;
    hub_code: string;
    city: string;
  };
  to_hub: {
    id: string;
    name: string;
    hub_code: string;
    city: string;
  };
  vehicle: {
    id: string;
    registration_number: string;
    vehicle_type: string;
  } | null;
  driver: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  status: string;
  scheduled_departure: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  created_at: string;
  expenses: TripExpenseWithUsers[];
  settlement: TripSettlementWithUser | null;
  totalAdvancesPaise: number;
  totalExpensesPaise: number;
  netBalancePaise: number; // positive = driver owes company, negative = company owes driver
  isSettled: boolean;
}

/**
 * Get all expenses for a specific trip, ordered chronologically.
 */
export async function getTripExpensesByTripId(
  supabase: AnySupabaseClient,
  tripId: string
): Promise<TripExpenseWithUsers[]> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      id,
      trip_id,
      driver_id,
      tenant_id,
      category,
      amount,
      description,
      is_voided,
      voided_by,
      voided_at,
      entered_by,
      entered_at,
      settlement_id,
      created_at,
      updated_at,
      entered_by_user:users!entered_by (
        id,
        full_name,
        email
      ),
      voided_by_user:users!voided_by (
        id,
        full_name,
        email
      ),
      driver:drivers!driver_id (
        id,
        full_name,
        phone
      )
    `)
    .eq('trip_id', tripId)
    .order('entered_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch trip expenses: ${error.message}`);
  }

  return (data as unknown as TripExpenseWithUsers[]) || [];
}

/**
 * Get a specific expense entry by ID with its trip details.
 */
export async function getTripExpenseById(
  supabase: AnySupabaseClient,
  expenseId: string
): Promise<(TripExpenseRow & { trip?: { id: string; from_hub_id: string } | null }) | null> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      id,
      trip_id,
      driver_id,
      tenant_id,
      category,
      amount,
      description,
      is_voided,
      voided_by,
      voided_at,
      entered_by,
      entered_at,
      settlement_id,
      created_at,
      updated_at,
      trip:trips!trip_id (
        id,
        from_hub_id
      )
    `)
    .eq('id', expenseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch trip expense: ${error.message}`);
  }

  return (data as unknown as (TripExpenseRow & { trip?: { id: string; from_hub_id: string } | null })) || null;
}

/**
 * Get the settlement record for a specific trip, if settled.
 */
export async function getTripSettlementByTripId(
  supabase: AnySupabaseClient,
  tripId: string
): Promise<TripSettlementWithUser | null> {
  const { data, error } = await supabase
    .from('trip_expense_settlements')
    .select(`
      id,
      trip_id,
      net_balance,
      settlement_mode,
      settled_by,
      settled_at,
      notes,
      tenant_id,
      created_at,
      updated_at,
      settled_by_user:users!settled_by (
        id,
        full_name,
        email
      )
    `)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch trip settlement: ${error.message}`);
  }

  return (data as unknown as TripSettlementWithUser) || null;
}

/**
 * Insert a new trip expense entry.
 */
export async function insertTripExpense(
  supabase: AnySupabaseClient,
  expense: {
    trip_id: string;
    driver_id: string | null;
    tenant_id: string;
    category: TripExpenseCategory;
    amount: number; // in paise
    description?: string | null;
    entered_by: string;
  }
): Promise<TripExpenseRow> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .insert({
      trip_id: expense.trip_id,
      driver_id: expense.driver_id,
      tenant_id: expense.tenant_id,
      category: expense.category,
      amount: expense.amount,
      description: expense.description ?? null,
      entered_by: expense.entered_by,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert trip expense: ${error.message}`);
  }

  return data;
}

/**
 * Void an expense entry (immutable soft-void).
 */
export async function voidTripExpense(
  supabase: AnySupabaseClient,
  expenseId: string,
  voidedBy: string
): Promise<TripExpenseRow> {
  const { data, error } = await supabase
    .from('trip_expenses')
    .update({
      is_voided: true,
      voided_by: voidedBy,
      voided_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to void trip expense: ${error.message}`);
  }

  return data;
}

/**
 * Create a settlement record for a trip and associate current expenses.
 */
export async function insertTripSettlement(
  supabase: AnySupabaseClient,
  settlement: {
    trip_id: string;
    net_balance: number; // in paise
    settlement_mode: SettlementPaymentMode;
    settled_by: string;
    notes?: string | null;
    tenant_id: string;
  }
): Promise<TripExpenseSettlementRow> {
  // 1. Insert settlement
  const { data, error } = await supabase
    .from('trip_expense_settlements')
    .insert({
      trip_id: settlement.trip_id,
      net_balance: settlement.net_balance,
      settlement_mode: settlement.settlement_mode,
      settled_by: settlement.settled_by,
      notes: settlement.notes ?? null,
      tenant_id: settlement.tenant_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert trip settlement: ${error.message}`);
  }

  // 2. Link settlement_id to non-voided expenses on this trip
  const { error: linkError } = await supabase
    .from('trip_expenses')
    .update({ settlement_id: data.id })
    .eq('trip_id', settlement.trip_id)
    .eq('is_voided', false);

  if (linkError) {
    throw new Error(`Failed to link expenses to settlement: ${linkError.message}`);
  }

  return data;
}

/**
 * Delete a trip settlement (re-open a settled trip).
 */
export async function deleteTripSettlement(
  supabase: AnySupabaseClient,
  tripId: string
): Promise<void> {
  // 1. Clear settlement_id on expenses
  const { error: unlinkError } = await supabase
    .from('trip_expenses')
    .update({ settlement_id: null })
    .eq('trip_id', tripId);

  if (unlinkError) {
    throw new Error(`Failed to unlink expenses from settlement: ${unlinkError.message}`);
  }

  // 2. Delete settlement record
  const { error } = await supabase
    .from('trip_expense_settlements')
    .delete()
    .eq('trip_id', tripId);

  if (error) {
    throw new Error(`Failed to delete trip settlement: ${error.message}`);
  }
}

/**
 * Get all trips with their expense summaries and settlements for the `/trip-expenses` page.
 */
export async function getTripsWithExpenseLedgerByTenant(
  supabase: AnySupabaseClient,
  options?: {
    search?: string;
    hubId?: string;
    settledFilter?: 'all' | 'unsettled' | 'settled';
  }
): Promise<TripWithExpenseLedger[]> {
  // Query trips with relations
  let query = supabase
    .from('trips')
    .select(`
      id,
      status,
      scheduled_departure,
      dispatched_at,
      completed_at,
      created_at,
      from_hub:hubs!from_hub_id (
        id,
        name,
        hub_code,
        city
      ),
      to_hub:hubs!to_hub_id (
        id,
        name,
        hub_code,
        city
      ),
      vehicle:vehicles!vehicle_id (
        id,
        registration_number,
        vehicle_type
      ),
      driver:drivers!driver_id (
        id,
        full_name,
        phone
      ),
      expenses:trip_expenses (
        id,
        trip_id,
        driver_id,
        tenant_id,
        category,
        amount,
        description,
        is_voided,
        voided_by,
        voided_at,
        entered_by,
        entered_at,
        settlement_id,
        created_at,
        updated_at,
        entered_by_user:users!entered_by (
          id,
          full_name,
          email
        ),
        voided_by_user:users!voided_by (
          id,
          full_name,
          email
        ),
        driver:drivers!driver_id (
          id,
          full_name,
          phone
        )
      ),
      settlement:trip_expense_settlements (
        id,
        trip_id,
        net_balance,
        settlement_mode,
        settled_by,
        settled_at,
        notes,
        tenant_id,
        created_at,
        updated_at,
        settled_by_user:users!settled_by (
          id,
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (options?.hubId && options.hubId !== 'ALL') {
    query = query.or(`from_hub_id.eq.${options.hubId},to_hub_id.eq.${options.hubId}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch trips ledger: ${error.message}`);
  }

  type RawTrip = {
    id: string;
    status: string;
    scheduled_departure: string | null;
    dispatched_at: string | null;
    completed_at: string | null;
    created_at: string;
    from_hub: { id: string; name: string; hub_code: string; city: string };
    to_hub: { id: string; name: string; hub_code: string; city: string };
    vehicle: { id: string; registration_number: string; vehicle_type: string } | null;
    driver: { id: string; full_name: string; phone: string } | null;
    expenses: TripExpenseWithUsers[];
    settlement: TripSettlementWithUser | TripSettlementWithUser[] | null;
  };

  const rawTrips = (data as unknown as RawTrip[]) || [];

  const results: TripWithExpenseLedger[] = rawTrips.map((t) => {
    const rawSettlement = Array.isArray(t.settlement) ? t.settlement[0] : t.settlement;
    const settlement = rawSettlement || null;
    const isSettled = !!settlement;

    const expenses = (t.expenses || []).sort(
      (a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()
    );

    let totalAdvancesPaise = 0;
    let totalExpensesPaise = 0;
    let netBalancePaise = 0;

    for (const exp of expenses) {
      if (!exp.is_voided) {
        if (exp.category === 'ADVANCE') {
          totalAdvancesPaise += Number(exp.amount);
        } else {
          totalExpensesPaise += Math.abs(Number(exp.amount));
        }
        netBalancePaise += Number(exp.amount);
      }
    }

    return {
      id: t.id,
      from_hub: t.from_hub,
      to_hub: t.to_hub,
      vehicle: t.vehicle,
      driver: t.driver,
      status: t.status,
      scheduled_departure: t.scheduled_departure,
      dispatched_at: t.dispatched_at,
      completed_at: t.completed_at,
      created_at: t.created_at,
      expenses,
      settlement,
      totalAdvancesPaise,
      totalExpensesPaise,
      netBalancePaise,
      isSettled,
    };
  });

  // Client-side search and settled filter
  let filtered = results;

  if (options?.settledFilter === 'settled') {
    filtered = filtered.filter((r) => r.isSettled);
  } else if (options?.settledFilter === 'unsettled') {
    filtered = filtered.filter((r) => !r.isSettled);
  }

  if (options?.search && options.search.trim().length > 0) {
    const s = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.from_hub.hub_code.toLowerCase().includes(s) ||
        r.from_hub.city.toLowerCase().includes(s) ||
        r.to_hub.hub_code.toLowerCase().includes(s) ||
        r.to_hub.city.toLowerCase().includes(s) ||
        r.vehicle?.registration_number.toLowerCase().includes(s) ||
        r.driver?.full_name.toLowerCase().includes(s)
    );
  }

  return filtered;
}

/**
 * Get count of unsettled trips with expenses, and total outstanding net balance in paise.
 */
export async function getUnsettledTripsSummary(
  supabase: AnySupabaseClient
): Promise<{
  unsettledCount: number;
  totalOutstandingBalancePaise: number;
}> {
  const trips = await getTripsWithExpenseLedgerByTenant(supabase);
  const unsettled = trips.filter((t) => !t.isSettled && t.expenses.length > 0);

  const totalOutstandingBalancePaise = unsettled.reduce(
    (sum, t) => sum + t.netBalancePaise,
    0
  );

  return {
    unsettledCount: unsettled.length,
    totalOutstandingBalancePaise,
  };
}
