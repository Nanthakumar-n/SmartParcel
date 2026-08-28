import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type HubRow = Database['public']['Tables']['hubs']['Row'];
export type HubInsert = Database['public']['Tables']['hubs']['Insert'];
export type HubUpdate = Database['public']['Tables']['hubs']['Update'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetHubsOptions {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Get all hubs for current tenant with optional search, active filter, and pagination.
 */
export async function getHubsByTenant(
  supabase: AnySupabaseClient,
  options: GetHubsOptions = {}
): Promise<{ data: HubRow[]; count: number }> {
  const { search, isActive, page = 0, pageSize = 50 } = options;

  let query = supabase
    .from('hubs')
    .select(
      'id, hub_code, name, address_line1, city, state, pin_code, latitude, longitude, contact_phone, is_active, tenant_id, created_at, updated_at',
      { count: 'exact' }
    )
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    query = query.or(`hub_code.ilike.%${term}%,name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Get single hub by ID.
 */
export async function getHubById(
  supabase: AnySupabaseClient,
  id: string
): Promise<HubRow | null> {
  const { data, error } = await supabase
    .from('hubs')
    .select('id, hub_code, name, address_line1, city, state, pin_code, latitude, longitude, contact_phone, is_active, tenant_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Insert a new hub.
 */
export async function insertHub(
  supabase: AnySupabaseClient,
  hubData: HubInsert
): Promise<HubRow> {
  const { data, error } = await supabase
    .from('hubs')
    .insert(hubData)
    .select('id, hub_code, name, address_line1, city, state, pin_code, latitude, longitude, contact_phone, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update an existing hub.
 */
export async function updateHub(
  supabase: AnySupabaseClient,
  id: string,
  hubData: HubUpdate
): Promise<HubRow> {
  const { data, error } = await supabase
    .from('hubs')
    .update({ ...hubData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, hub_code, name, address_line1, city, state, pin_code, latitude, longitude, contact_phone, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle hub active status.
 */
export async function toggleHubActive(
  supabase: AnySupabaseClient,
  id: string,
  isActive: boolean
): Promise<HubRow> {
  return updateHub(supabase, id, { is_active: isActive });
}

export interface HubWithMetrics extends HubRow {
  in_station_trucks_count: number;
  incoming_trucks_count: number;
  incoming_lrs_count: number;
  outgoing_trucks_count: number;
  outgoing_lrs_count: number;
}

/**
 * Get all hubs for tenant enriched with live fleet and cargo dispatch metrics:
 * - in_station_trucks_count: available vehicles stationed at this hub
 * - incoming_trucks_count & incoming_lrs_count: trips IN_TRANSIT with destination = this hub
 * - outgoing_trucks_count & outgoing_lrs_count: trips SCHEDULED/IN_TRANSIT departing from this hub
 */
export async function getHubsWithMetricsByTenant(
  supabase: AnySupabaseClient,
  options: GetHubsOptions = {}
): Promise<{ data: HubWithMetrics[]; count: number }> {
  const { data: hubs, count } = await getHubsByTenant(supabase, options);

  if (!hubs || hubs.length === 0) {
    return { data: [], count: 0 };
  }

  // Fetch active vehicles with current_hub_id
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, current_hub_id, status')
    .eq('is_active', true);

  if (vehiclesError) throw vehiclesError;

  // Fetch active trips (SCHEDULED, IN_TRANSIT) with their LRs
  const { data: activeTrips, error: tripsError } = await supabase
    .from('trips')
    .select(
      `
      id,
      vehicle_id,
      from_hub_id,
      to_hub_id,
      status,
      lorry_receipts:lorry_receipts (
        id,
        status
      )
    `
    )
    .in('status', ['SCHEDULED', 'IN_TRANSIT']);

  if (tripsError) throw tripsError;

  interface ActiveTripItem {
    id: string;
    vehicle_id: string | null;
    from_hub_id: string;
    to_hub_id: string;
    status: string;
    lorry_receipts: { id: string; status: string }[];
  }

  const tripsList = (activeTrips as unknown as ActiveTripItem[]) ?? [];

  const enrichedHubs: HubWithMetrics[] = hubs.map((hub) => {
    // 1. In-station available trucks
    const inStationTrucks = (vehicles ?? []).filter(
      (v) => v.current_hub_id === hub.id && v.status === 'AVAILABLE'
    ).length;

    // 2. Incoming: Trips IN_TRANSIT to this hub
    const incomingTrips = tripsList.filter(
      (t) => t.to_hub_id === hub.id && t.status === 'IN_TRANSIT'
    );
    const incomingTrucks = new Set(
      incomingTrips.map((t) => t.vehicle_id).filter(Boolean)
    ).size;
    const incomingLRs = incomingTrips.reduce((acc, t) => {
      const activeLRs = (t.lorry_receipts || []).filter((lr) => lr.status === 'IN_TRANSIT');
      return acc + activeLRs.length;
    }, 0);

    // 3. Outgoing: Trips SCHEDULED or IN_TRANSIT departing from this hub
    const outgoingTrips = tripsList.filter((t) => t.from_hub_id === hub.id);
    const outgoingTrucks = new Set(
      outgoingTrips.map((t) => t.vehicle_id).filter(Boolean)
    ).size;
    const outgoingLRs = outgoingTrips.reduce((acc, t) => {
      const activeLRs = (t.lorry_receipts || []).filter(
        (lr) => lr.status === 'BOOKED' || lr.status === 'IN_TRANSIT'
      );
      return acc + activeLRs.length;
    }, 0);

    return {
      ...hub,
      in_station_trucks_count: inStationTrucks,
      incoming_trucks_count: incomingTrucks,
      incoming_lrs_count: incomingLRs,
      outgoing_trucks_count: outgoingTrucks,
      outgoing_lrs_count: outgoingLRs,
    };
  });

  return {
    data: enrichedHubs,
    count: count,
  };
}
