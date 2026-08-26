import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { LRStatus } from '@/lib/types/lr';

export type LRRow = Database['public']['Tables']['lorry_receipts']['Row'];
export type LRInsert = Database['public']['Tables']['lorry_receipts']['Insert'];
export type LRUpdate = Database['public']['Tables']['lorry_receipts']['Update'];

export interface LRDetailed extends LRRow {
  from_hub: {
    id: string;
    hub_code: string;
    name: string;
    city: string;
    address_line1: string;
    contact_phone: string;
  } | null;
  to_hub: {
    id: string;
    hub_code: string;
    name: string;
    city: string;
    address_line1: string;
    contact_phone: string;
  } | null;
  trip: {
    id: string;
    status: string;
    scheduled_departure: string | null;
    vehicle: {
      registration_number: string;
      vehicle_type: string;
    } | null;
    driver: {
      full_name: string;
      phone: string;
    } | null;
  } | null;
  creator: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetLRsOptions {
  page?: number;
  pageSize?: number;
  status?: LRStatus | 'ALL';
  fromHubId?: string;
  toHubId?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get paginated list of LRs for the tenant with joined hub and trip details.
 */
export async function getLRsByTenant(
  supabase: AnySupabaseClient,
  options?: GetLRsOptions
): Promise<{ data: LRDetailed[]; count: number }> {
  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 25;

  let query = supabase
    .from('lorry_receipts')
    .select(
      `
      id,
      lr_number,
      booking_date,
      source,
      from_hub_id,
      to_hub_id,
      trip_id,
      consignor_name,
      consignor_phone,
      consignor_gstin,
      consignee_name,
      consignee_phone,
      consignee_gstin,
      goods_description,
      quantity,
      weight_kg,
      num_packages,
      freight_amount,
      payment_mode,
      expected_delivery_date,
      status,
      tenant_id,
      created_by,
      created_at,
      updated_at,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      trip:trips (
        id,
        status,
        scheduled_departure,
        vehicle:vehicles (
          registration_number,
          vehicle_type
        ),
        driver:drivers (
          full_name,
          phone
        )
      ),
      creator:users!created_by (
        id,
        full_name,
        email
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'ALL') {
    query = query.eq('status', options.status);
  }
  if (options?.fromHubId && options.fromHubId !== 'ALL') {
    query = query.eq('from_hub_id', options.fromHubId);
  }
  if (options?.toHubId && options.toHubId !== 'ALL') {
    query = query.eq('to_hub_id', options.toHubId);
  }
  if (options?.dateFrom) {
    query = query.gte('booking_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('booking_date', options.dateTo);
  }
  if (options?.searchQuery && options.searchQuery.trim() !== '') {
    const q = `%${options.searchQuery.trim()}%`;
    query = query.or(
      `lr_number.ilike.${q},consignor_name.ilike.${q},consignor_phone.ilike.${q},consignee_name.ilike.${q},consignee_phone.ilike.${q}`
    );
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return {
    data: (data as unknown as LRDetailed[]) ?? [],
    count: count ?? 0,
  };
}

/**
 * Get a single LR by ID.
 */
export async function getLRById(
  supabase: AnySupabaseClient,
  id: string
): Promise<LRDetailed | null> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .select(
      `
      id,
      lr_number,
      booking_date,
      source,
      from_hub_id,
      to_hub_id,
      trip_id,
      consignor_name,
      consignor_phone,
      consignor_gstin,
      consignee_name,
      consignee_phone,
      consignee_gstin,
      goods_description,
      quantity,
      weight_kg,
      num_packages,
      freight_amount,
      payment_mode,
      expected_delivery_date,
      status,
      tenant_id,
      created_by,
      created_at,
      updated_at,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      trip:trips (
        id,
        status,
        scheduled_departure,
        vehicle:vehicles (
          registration_number,
          vehicle_type
        ),
        driver:drivers (
          full_name,
          phone
        )
      ),
      creator:users!created_by (
        id,
        full_name,
        email
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as LRDetailed | null;
}

/**
 * Insert an LR into lorry_receipts (lr_number is auto-populated by Postgres trigger).
 */
export async function insertLR(
  supabase: AnySupabaseClient,
  lr: LRInsert
): Promise<LRRow> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .insert(lr)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get active scheduled trips between two hubs to auto-slot or select for LR.
 */
export async function getActiveTripsForRoute(
  supabase: AnySupabaseClient,
  fromHubId: string,
  toHubId: string
) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      id,
      scheduled_departure,
      status,
      vehicle:vehicles (
        registration_number,
        vehicle_type
      ),
      driver:drivers (
        full_name,
        phone
      )
    `
    )
    .eq('from_hub_id', fromHubId)
    .eq('to_hub_id', toHubId)
    .in('status', ['SCHEDULED'])
    .order('scheduled_departure', { ascending: true })
    .limit(10);

  if (error) {
    return [];
  }

  return data ?? [];
}

/**
 * Update the status of a Lorry Receipt.
 */
export async function updateLRStatus(
  supabase: AnySupabaseClient,
  id: string,
  status: LRStatus
): Promise<LRRow> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the trip assignment of a Lorry Receipt.
 */
export async function updateLRTrip(
  supabase: AnySupabaseClient,
  id: string,
  tripId: string | null
): Promise<LRRow> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .update({ trip_id: tripId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recent LRs for dashboard with joined hub details.
 */
export async function getRecentLRsByTenant(
  supabase: AnySupabaseClient,
  limit = 5
): Promise<LRDetailed[]> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .select(
      `
      id,
      lr_number,
      booking_date,
      source,
      from_hub_id,
      to_hub_id,
      trip_id,
      consignor_name,
      consignor_phone,
      consignor_gstin,
      consignee_name,
      consignee_phone,
      consignee_gstin,
      goods_description,
      quantity,
      weight_kg,
      num_packages,
      freight_amount,
      payment_mode,
      expected_delivery_date,
      status,
      tenant_id,
      created_by,
      created_at,
      updated_at,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        name,
        city,
        address_line1,
        contact_phone
      ),
      trip:trips (
        id,
        status,
        scheduled_departure,
        vehicle:vehicles (
          registration_number,
          vehicle_type
        ),
        driver:drivers (
          full_name,
          phone
        )
      ),
      creator:users!created_by (
        id,
        full_name,
        email
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as unknown as LRDetailed[]) ?? [];
}

/**
 * Auto-assign all BOOKED pool LRs (trip_id IS NULL) matching a route to the given trip.
 * Called immediately after trip creation so the manifest is pre-populated.
 * Returns the number of LRs assigned.
 */
export async function assignPoolLRsToTrip(
  supabase: AnySupabaseClient,
  tripId: string,
  fromHubId: string,
  toHubId: string,
  tenantId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .update({ trip_id: tripId, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('from_hub_id', fromHubId)
    .eq('to_hub_id', toHubId)
    .eq('status', 'BOOKED')
    .is('trip_id', null)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Release all BOOKED LRs assigned to a trip back to the pool (trip_id = NULL).
 * Called when a SCHEDULED trip is cancelled — LRs remain BOOKED for re-assignment.
 */
export async function releaseTripLRs(
  supabase: AnySupabaseClient,
  tripId: string
): Promise<void> {
  const { error } = await supabase
    .from('lorry_receipts')
    .update({ trip_id: null, updated_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('status', 'BOOKED');

  if (error) throw error;
}

/**
 * Revert all IN_TRANSIT LRs on a trip back to BOOKED and release them to the pool.
 * Called when a Fleet Owner cancels an IN_TRANSIT trip (e.g. truck breakdown).
 * Returns the IDs of affected LRs for audit trail writing.
 */
export async function revertTripLRsToBooked(
  supabase: AnySupabaseClient,
  tripId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('lorry_receipts')
    .update({ status: 'BOOKED', trip_id: null, updated_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('status', 'IN_TRANSIT')
    .select('id');

  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}
