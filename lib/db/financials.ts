import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface DateRangeFilter {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export interface AgingBuckets {
  bucket0to7Paise: number;
  bucket7to30Paise: number;
  bucket30PlusPaise: number;
  bucket0to7Count: number;
  bucket7to30Count: number;
  bucket30PlusCount: number;
}

export interface FleetPLMetrics {
  bookedRevenuePaise: number;
  bookedLRCount: number;
  collectedRevenuePaise: number;
  collectedLRCount: number;
  collectionRatePercent: number;
  outstandingReceivablesPaise: number;
  outstandingLRCount: number;
  aging: AgingBuckets;
  pipelineRevenuePaise: number;
  pipelineLRCount: number;
  totalExpensesPaise: number;
  netPLPaise: number;
  profitMarginPercent: number;
  unsettledAdvancesPaise: number;
  unsettledTripsCount: number;
}

export interface HubPLRow {
  hubId: string;
  hubCode: string;
  hubName: string;
  city: string;
  bookedRevenuePaise: number;
  bookedLRCount: number;
  collectedRevenuePaise: number;
  collectedLRCount: number;
  outstandingReceivablesPaise: number;
  outstandingLRCount: number;
  pipelineRevenuePaise: number;
  pipelineLRCount: number;
  totalExpensesPaise: number;
  netPLPaise: number;
  profitMarginPercent: number;
  aging: AgingBuckets;
}

export interface HubReceivableLR {
  id: string;
  lrNumber: string;
  bookingDate: string;
  paymentMode: string;
  freightAmountPaise: number;
  consigneeName: string;
  consigneePhone: string;
  consignorName: string;
  toHubCode: string;
  status: string;
  daysOutstanding: number;
  agingBucket: '0-7' | '7-30' | '30+';
}

export interface TripPLRow {
  id: string;
  fromHub: { id: string; name: string; hub_code: string; city: string };
  toHub: { id: string; name: string; hub_code: string; city: string };
  vehicle: { id: string; registration_number: string; vehicle_type: string } | null;
  driver: { id: string; full_name: string; phone: string } | null;
  status: string;
  scheduledDeparture: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  lrCount: number;
  freightRevenuePaise: number;
  totalExpensesPaise: number;
  totalAdvancesPaise: number;
  netPLPaise: number; // freightRevenuePaise - totalExpensesPaise
  driverBalancePaise: number; // positive = driver owes company, negative = company owes driver
  isSettled: boolean;
}

/**
 * Calculate days between booking date and today.
 */
function getDaysOutstanding(bookingDateStr: string): number {
  const bookingDate = new Date(bookingDateStr);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - bookingDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Helper to classify aging bucket based on days.
 */
function getAgingBucket(days: number): '0-7' | '7-30' | '30+' {
  if (days <= 7) return '0-7';
  if (days <= 30) return '7-30';
  return '30+';
}

/**
 * Get fleet-wide P&L metrics for a given date range.
 */
export async function getFleetPL(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter
): Promise<FleetPLMetrics> {
  // 1. Fetch LRs within date range (excluding CANCELLED)
  let lrQuery = supabase
    .from('lorry_receipts')
    .select(`
      id,
      freight_amount,
      payment_mode,
      status,
      booking_date,
      from_hub_id
    `)
    .neq('status', 'CANCELLED');

  if (dateRange?.dateFrom) {
    lrQuery = lrQuery.gte('booking_date', dateRange.dateFrom);
  }
  if (dateRange?.dateTo) {
    lrQuery = lrQuery.lte('booking_date', dateRange.dateTo);
  }

  // 2. Fetch all collections for TO_PAY LRs
  const collectionsQuery = supabase
    .from('to_pay_collections')
    .select('lr_id, collected, amount_collected');

  // 3. Fetch Pipeline LRs (current snapshot: IN_TRANSIT & ARRIVED - undated)
  const pipelineQuery = supabase
    .from('lorry_receipts')
    .select('freight_amount, status')
    .in('status', ['IN_TRANSIT', 'ARRIVED']);

  // 4. Fetch trip expenses
  let expensesQuery = supabase
    .from('trip_expenses')
    .select('amount, category, is_voided, entered_at, settlement_id, trip_id')
    .eq('is_voided', false);

  if (dateRange?.dateFrom) {
    expensesQuery = expensesQuery.gte('entered_at', `${dateRange.dateFrom}T00:00:00.000Z`);
  }
  if (dateRange?.dateTo) {
    expensesQuery = expensesQuery.lte('entered_at', `${dateRange.dateTo}T23:59:59.999Z`);
  }

  // 5. Fetch all unsettled trip expenses for total advance ledger balance
  const unsettledExpensesQuery = supabase
    .from('trip_expenses')
    .select('amount, is_voided, settlement_id, trip_id')
    .eq('is_voided', false)
    .is('settlement_id', null);

  const [
    { data: lrsData, error: lrError },
    { data: collectionsData, error: collError },
    { data: pipelineData, error: pipeError },
    { data: expensesData, error: expError },
    { data: unsettledExpensesData, error: unError },
  ] = await Promise.all([
    lrQuery,
    collectionsQuery,
    pipelineQuery,
    expensesQuery,
    unsettledExpensesQuery,
  ]);

  if (lrError) throw new Error(`Failed to fetch LRs for Fleet P&L: ${lrError.message}`);
  if (collError) throw new Error(`Failed to fetch collections: ${collError.message}`);
  if (pipeError) throw new Error(`Failed to fetch pipeline: ${pipeError.message}`);
  if (expError) throw new Error(`Failed to fetch expenses: ${expError.message}`);
  if (unError) throw new Error(`Failed to fetch unsettled expenses: ${unError.message}`);

  const lrs = lrsData || [];
  const collectionsMap = new Map<string, { collected: boolean; amount_collected: number }>();
  (collectionsData || []).forEach((c) => {
    collectionsMap.set(c.lr_id, {
      collected: c.collected,
      amount_collected: Number(c.amount_collected) || 0,
    });
  });

  let bookedRevenuePaise = 0;
  let bookedLRCount = 0;
  let collectedRevenuePaise = 0;
  let collectedLRCount = 0;
  let outstandingReceivablesPaise = 0;
  let outstandingLRCount = 0;

  const aging: AgingBuckets = {
    bucket0to7Paise: 0,
    bucket7to30Paise: 0,
    bucket30PlusPaise: 0,
    bucket0to7Count: 0,
    bucket7to30Count: 0,
    bucket30PlusCount: 0,
  };

  for (const lr of lrs) {
    const freight = Number(lr.freight_amount) || 0;
    bookedRevenuePaise += freight;
    bookedLRCount += 1;

    const collection = collectionsMap.get(lr.id);
    const isCollected = lr.payment_mode === 'PAID' || (lr.payment_mode === 'TO_PAY' && collection?.collected === true);

    if (isCollected) {
      collectedRevenuePaise += lr.payment_mode === 'PAID' ? freight : (collection?.amount_collected || freight);
      collectedLRCount += 1;
    } else {
      // Uncollected (TO_PAY not collected or TBB)
      outstandingReceivablesPaise += freight;
      outstandingLRCount += 1;

      const days = getDaysOutstanding(lr.booking_date);
      const bucket = getAgingBucket(days);
      if (bucket === '0-7') {
        aging.bucket0to7Paise += freight;
        aging.bucket0to7Count += 1;
      } else if (bucket === '7-30') {
        aging.bucket7to30Paise += freight;
        aging.bucket7to30Count += 1;
      } else {
        aging.bucket30PlusPaise += freight;
        aging.bucket30PlusCount += 1;
      }
    }
  }

  // Pipeline revenue
  let pipelineRevenuePaise = 0;
  let pipelineLRCount = 0;
  for (const lr of pipelineData || []) {
    pipelineRevenuePaise += Number(lr.freight_amount) || 0;
    pipelineLRCount += 1;
  }

  // Expenses in period (only actual operational expenses, not driver advances)
  let totalExpensesPaise = 0;
  for (const exp of expensesData || []) {
    if (exp.category !== 'ADVANCE') {
      totalExpensesPaise += Math.abs(Number(exp.amount) || 0);
    }
  }

  const netPLPaise = bookedRevenuePaise - totalExpensesPaise;
  const profitMarginPercent =
    bookedRevenuePaise > 0
      ? Math.round(((bookedRevenuePaise - totalExpensesPaise) / bookedRevenuePaise) * 1000) / 10
      : 0;

  const collectionRatePercent =
    bookedRevenuePaise > 0
      ? Math.round((collectedRevenuePaise / bookedRevenuePaise) * 1000) / 10
      : 0;

  // Unsettled driver balances across company
  const unsettledTripIds = new Set<string>();
  let unsettledAdvancesPaise = 0;
  for (const unExp of unsettledExpensesData || []) {
    unsettledTripIds.add(unExp.trip_id);
    unsettledAdvancesPaise += Number(unExp.amount) || 0;
  }

  return {
    bookedRevenuePaise,
    bookedLRCount,
    collectedRevenuePaise,
    collectedLRCount,
    collectionRatePercent,
    outstandingReceivablesPaise,
    outstandingLRCount,
    aging,
    pipelineRevenuePaise,
    pipelineLRCount,
    totalExpensesPaise,
    netPLPaise,
    profitMarginPercent,
    unsettledAdvancesPaise,
    unsettledTripsCount: unsettledTripIds.size,
  };
}

/**
 * Get Hub-wise P&L breakdown for a given date range.
 */
export async function getHubPL(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter
): Promise<HubPLRow[]> {
  // 1. Fetch active hubs
  const { data: hubsData, error: hubError } = await supabase
    .from('hubs')
    .select('id, hub_code, name, city')
    .eq('is_active', true)
    .order('hub_code', { ascending: true });

  if (hubError) throw new Error(`Failed to fetch hubs: ${hubError.message}`);
  const hubs = hubsData || [];

  // 2. Fetch all non-cancelled LRs in range with from_hub_id
  let lrQuery = supabase
    .from('lorry_receipts')
    .select('id, freight_amount, payment_mode, status, booking_date, from_hub_id')
    .neq('status', 'CANCELLED');

  if (dateRange?.dateFrom) {
    lrQuery = lrQuery.gte('booking_date', dateRange.dateFrom);
  }
  if (dateRange?.dateTo) {
    lrQuery = lrQuery.lte('booking_date', dateRange.dateTo);
  }

  // 3. Fetch all collections
  const collectionsQuery = supabase
    .from('to_pay_collections')
    .select('lr_id, collected, amount_collected');

  // 4. Fetch pipeline LRs
  const pipelineQuery = supabase
    .from('lorry_receipts')
    .select('freight_amount, from_hub_id, status')
    .in('status', ['IN_TRANSIT', 'ARRIVED']);

  // 5. Fetch trip expenses joined with trip origin hub
  let expensesQuery = supabase
    .from('trip_expenses')
    .select(`
      amount,
      category,
      is_voided,
      entered_at,
      trip:trips!trip_id (
        from_hub_id
      )
    `)
    .eq('is_voided', false);

  if (dateRange?.dateFrom) {
    expensesQuery = expensesQuery.gte('entered_at', `${dateRange.dateFrom}T00:00:00.000Z`);
  }
  if (dateRange?.dateTo) {
    expensesQuery = expensesQuery.lte('entered_at', `${dateRange.dateTo}T23:59:59.999Z`);
  }

  const [
    { data: lrsData, error: lrError },
    { data: collectionsData, error: collError },
    { data: pipelineData, error: pipeError },
    { data: expensesData, error: expError },
  ] = await Promise.all([
    lrQuery,
    collectionsQuery,
    pipelineQuery,
    expensesQuery,
  ]);

  if (lrError) throw new Error(`Failed to fetch LRs for Hub P&L: ${lrError.message}`);
  if (collError) throw new Error(`Failed to fetch collections: ${collError.message}`);
  if (pipeError) throw new Error(`Failed to fetch pipeline: ${pipeError.message}`);
  if (expError) throw new Error(`Failed to fetch hub expenses: ${expError.message}`);

  const collectionsMap = new Map<string, { collected: boolean; amount_collected: number }>();
  (collectionsData || []).forEach((c) => {
    collectionsMap.set(c.lr_id, {
      collected: c.collected,
      amount_collected: Number(c.amount_collected) || 0,
    });
  });

  // Aggregate by hubId
  const hubMetricsMap = new Map<
    string,
    {
      bookedRevenuePaise: number;
      bookedLRCount: number;
      collectedRevenuePaise: number;
      collectedLRCount: number;
      outstandingReceivablesPaise: number;
      outstandingLRCount: number;
      pipelineRevenuePaise: number;
      pipelineLRCount: number;
      totalExpensesPaise: number;
      aging: AgingBuckets;
    }
  >();

  for (const hub of hubs) {
    hubMetricsMap.set(hub.id, {
      bookedRevenuePaise: 0,
      bookedLRCount: 0,
      collectedRevenuePaise: 0,
      collectedLRCount: 0,
      outstandingReceivablesPaise: 0,
      outstandingLRCount: 0,
      pipelineRevenuePaise: 0,
      pipelineLRCount: 0,
      totalExpensesPaise: 0,
      aging: {
        bucket0to7Paise: 0,
        bucket7to30Paise: 0,
        bucket30PlusPaise: 0,
        bucket0to7Count: 0,
        bucket7to30Count: 0,
        bucket30PlusCount: 0,
      },
    });
  }

  // Process LRs
  for (const lr of lrsData || []) {
    const metrics = hubMetricsMap.get(lr.from_hub_id);
    if (!metrics) continue;

    const freight = Number(lr.freight_amount) || 0;
    metrics.bookedRevenuePaise += freight;
    metrics.bookedLRCount += 1;

    const collection = collectionsMap.get(lr.id);
    const isCollected = lr.payment_mode === 'PAID' || (lr.payment_mode === 'TO_PAY' && collection?.collected === true);

    if (isCollected) {
      metrics.collectedRevenuePaise += lr.payment_mode === 'PAID' ? freight : (collection?.amount_collected || freight);
      metrics.collectedLRCount += 1;
    } else {
      metrics.outstandingReceivablesPaise += freight;
      metrics.outstandingLRCount += 1;

      const days = getDaysOutstanding(lr.booking_date);
      const bucket = getAgingBucket(days);
      if (bucket === '0-7') {
        metrics.aging.bucket0to7Paise += freight;
        metrics.aging.bucket0to7Count += 1;
      } else if (bucket === '7-30') {
        metrics.aging.bucket7to30Paise += freight;
        metrics.aging.bucket7to30Count += 1;
      } else {
        metrics.aging.bucket30PlusPaise += freight;
        metrics.aging.bucket30PlusCount += 1;
      }
    }
  }

  // Process Pipeline
  for (const lr of pipelineData || []) {
    const metrics = hubMetricsMap.get(lr.from_hub_id);
    if (metrics) {
      metrics.pipelineRevenuePaise += Number(lr.freight_amount) || 0;
      metrics.pipelineLRCount += 1;
    }
  }

  // Process Expenses
  type RawExp = {
    amount: number;
    category: string;
    trip: { from_hub_id: string } | null;
  };
  for (const rawExp of (expensesData as unknown as RawExp[]) || []) {
    if (rawExp.category !== 'ADVANCE' && rawExp.trip?.from_hub_id) {
      const metrics = hubMetricsMap.get(rawExp.trip.from_hub_id);
      if (metrics) {
        metrics.totalExpensesPaise += Math.abs(Number(rawExp.amount) || 0);
      }
    }
  }

  // Build result rows
  return hubs.map((hub) => {
    const m = hubMetricsMap.get(hub.id)!;
    const netPLPaise = m.bookedRevenuePaise - m.totalExpensesPaise;
    const profitMarginPercent =
      m.bookedRevenuePaise > 0
        ? Math.round(((m.bookedRevenuePaise - m.totalExpensesPaise) / m.bookedRevenuePaise) * 1000) / 10
        : 0;

    return {
      hubId: hub.id,
      hubCode: hub.hub_code,
      hubName: hub.name,
      city: hub.city,
      bookedRevenuePaise: m.bookedRevenuePaise,
      bookedLRCount: m.bookedLRCount,
      collectedRevenuePaise: m.collectedRevenuePaise,
      collectedLRCount: m.collectedLRCount,
      outstandingReceivablesPaise: m.outstandingReceivablesPaise,
      outstandingLRCount: m.outstandingLRCount,
      pipelineRevenuePaise: m.pipelineRevenuePaise,
      pipelineLRCount: m.pipelineLRCount,
      totalExpensesPaise: m.totalExpensesPaise,
      netPLPaise,
      profitMarginPercent,
      aging: m.aging,
    };
  });
}

/**
 * Get detailed outstanding receivables for a given hub with aging breakdown.
 */
export async function getHubReceivables(
  supabase: AnySupabaseClient,
  hubId: string,
  dateRange?: DateRangeFilter
): Promise<HubReceivableLR[]> {
  let query = supabase
    .from('lorry_receipts')
    .select(`
      id,
      lr_number,
      booking_date,
      payment_mode,
      freight_amount,
      consignee_name,
      consignee_phone,
      consignor_name,
      status,
      to_hub:hubs!to_hub_id (
        hub_code
      )
    `)
    .eq('from_hub_id', hubId)
    .neq('status', 'CANCELLED');

  if (dateRange?.dateFrom) {
    query = query.gte('booking_date', dateRange.dateFrom);
  }
  if (dateRange?.dateTo) {
    query = query.lte('booking_date', dateRange.dateTo);
  }

  const { data: lrsData, error: lrError } = await query;
  if (lrError) throw new Error(`Failed to fetch hub receivables: ${lrError.message}`);

  const lrIds = (lrsData || []).map((lr) => lr.id);
  if (lrIds.length === 0) return [];

  // Fetch to_pay_collections for these LRs
  const { data: collectionsData, error: collError } = await supabase
    .from('to_pay_collections')
    .select('lr_id, collected')
    .in('lr_id', lrIds);

  if (collError) throw new Error(`Failed to fetch collections: ${collError.message}`);

  const collectionsMap = new Map<string, boolean>();
  (collectionsData || []).forEach((c) => {
    collectionsMap.set(c.lr_id, c.collected);
  });

  type RawLR = {
    id: string;
    lr_number: string;
    booking_date: string;
    payment_mode: string;
    freight_amount: number;
    consignee_name: string;
    consignee_phone: string;
    consignor_name: string;
    status: string;
    to_hub: { hub_code: string } | null;
  };

  const results: HubReceivableLR[] = [];

  for (const lr of (lrsData as unknown as RawLR[]) || []) {
    const isCollected = lr.payment_mode === 'PAID' || (lr.payment_mode === 'TO_PAY' && collectionsMap.get(lr.id) === true);

    if (!isCollected) {
      const days = getDaysOutstanding(lr.booking_date);
      results.push({
        id: lr.id,
        lrNumber: lr.lr_number,
        bookingDate: lr.booking_date,
        paymentMode: lr.payment_mode,
        freightAmountPaise: Number(lr.freight_amount) || 0,
        consigneeName: lr.consignee_name,
        consigneePhone: lr.consignee_phone,
        consignorName: lr.consignor_name,
        toHubCode: lr.to_hub?.hub_code || '---',
        status: lr.status,
        daysOutstanding: days,
        agingBucket: getAgingBucket(days),
      });
    }
  }

  // Sort by days outstanding descending (oldest first)
  return results.sort((a, b) => b.daysOutstanding - a.daysOutstanding);
}

/**
 * Get Trip-wise P&L by joining trips with freight from assigned LRs and trip expenses.
 */
export async function getTripPLByTenant(
  supabase: AnySupabaseClient,
  dateRange?: DateRangeFilter,
  options?: {
    search?: string;
    hubId?: string;
  }
): Promise<TripPLRow[]> {
  let tripQuery = supabase
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
      lrs:lorry_receipts (
        id,
        freight_amount,
        status
      ),
      expenses:trip_expenses (
        id,
        category,
        amount,
        is_voided
      ),
      settlement:trip_expense_settlements (
        id
      )
    `)
    .order('created_at', { ascending: false });

  if (options?.hubId && options.hubId !== 'ALL') {
    tripQuery = tripQuery.or(`from_hub_id.eq.${options.hubId},to_hub_id.eq.${options.hubId}`);
  }

  if (dateRange?.dateFrom) {
    tripQuery = tripQuery.gte('created_at', `${dateRange.dateFrom}T00:00:00.000Z`);
  }
  if (dateRange?.dateTo) {
    tripQuery = tripQuery.lte('created_at', `${dateRange.dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await tripQuery;
  if (error) throw new Error(`Failed to fetch trip P&L: ${error.message}`);

  type RawTrip = {
    id: string;
    status: string;
    scheduled_departure: string | null;
    dispatched_at: string | null;
    completed_at: string | null;
    from_hub: { id: string; name: string; hub_code: string; city: string };
    to_hub: { id: string; name: string; hub_code: string; city: string };
    vehicle: { id: string; registration_number: string; vehicle_type: string } | null;
    driver: { id: string; full_name: string; phone: string } | null;
    lrs: Array<{ id: string; freight_amount: number; status: string }>;
    expenses: Array<{ id: string; category: string; amount: number; is_voided: boolean }>;
    settlement: Array<{ id: string }> | { id: string } | null;
  };

  const rawTrips = (data as unknown as RawTrip[]) || [];

  const results: TripPLRow[] = rawTrips.map((t) => {
    // 1. Sum LR freight revenue for non-cancelled LRs
    const nonCancelledLRs = (t.lrs || []).filter((lr) => lr.status !== 'CANCELLED');
    const freightRevenuePaise = nonCancelledLRs.reduce(
      (sum, lr) => sum + (Number(lr.freight_amount) || 0),
      0
    );

    // 2. Sum trip expenses and advances
    let totalExpensesPaise = 0;
    let totalAdvancesPaise = 0;
    let driverBalancePaise = 0;

    for (const exp of t.expenses || []) {
      if (!exp.is_voided) {
        const amt = Number(exp.amount) || 0;
        if (exp.category === 'ADVANCE') {
          totalAdvancesPaise += amt;
        } else {
          totalExpensesPaise += Math.abs(amt);
        }
        driverBalancePaise += amt;
      }
    }

    const isSettled = Array.isArray(t.settlement) ? t.settlement.length > 0 : !!t.settlement;
    const netPLPaise = freightRevenuePaise - totalExpensesPaise;

    return {
      id: t.id,
      fromHub: t.from_hub,
      toHub: t.to_hub,
      vehicle: t.vehicle,
      driver: t.driver,
      status: t.status,
      scheduledDeparture: t.scheduled_departure,
      dispatchedAt: t.dispatched_at,
      completedAt: t.completed_at,
      lrCount: nonCancelledLRs.length,
      freightRevenuePaise,
      totalExpensesPaise,
      totalAdvancesPaise,
      netPLPaise,
      driverBalancePaise,
      isSettled,
    };
  });

  if (options?.search && options.search.trim().length > 0) {
    const s = options.search.toLowerCase().trim();
    return results.filter(
      (r) =>
        r.fromHub.hub_code.toLowerCase().includes(s) ||
        r.fromHub.city.toLowerCase().includes(s) ||
        r.toHub.hub_code.toLowerCase().includes(s) ||
        r.toHub.city.toLowerCase().includes(s) ||
        r.vehicle?.registration_number.toLowerCase().includes(s) ||
        r.driver?.full_name.toLowerCase().includes(s)
    );
  }

  return results;
}
