import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type TripRow = Database['public']['Tables']['trips']['Row'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];

export interface TripWithRelations extends TripRow {
  from_hub: {
    id: string;
    hub_code: string;
    city: string;
    name: string;
  };
  to_hub: {
    id: string;
    hub_code: string;
    city: string;
    name: string;
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
  lorry_receipts: {
    id: string;
    lr_number: string | null;
    status: string;
    freight_amount: number;
    consignor_name: string;
    consignee_name: string;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetTripsOptions {
  status?: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  fromHubId?: string;
  toHubId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch trips for tenant with full relationship details and filter parameters.
 */
export async function getTripsByTenant(
  supabase: AnySupabaseClient,
  options: GetTripsOptions = {}
): Promise<{ data: TripWithRelations[]; count: number }> {
  const { status, fromHubId, toHubId, page = 0, pageSize = 50 } = options;

  let query = supabase
    .from('trips')
    .select(
      `
      *,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        city,
        name
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        city,
        name
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
      lorry_receipts (
        id,
        lr_number,
        status,
        freight_amount,
        consignor_name,
        consignee_name
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (fromHubId) {
    query = query.eq('from_hub_id', fromHubId);
  }
  if (toHubId) {
    query = query.eq('to_hub_id', toHubId);
  }

  const fromRange = page * pageSize;
  const toRange = (page + 1) * pageSize - 1;
  const { data, count, error } = await query.range(fromRange, toRange);

  if (error) throw error;
  return {
    data: (data as unknown as TripWithRelations[]) || [],
    count: count || 0,
  };
}

/**
 * Fetch a single trip by ID with manifest relationships.
 */
export async function getTripById(
  supabase: AnySupabaseClient,
  id: string
): Promise<TripWithRelations | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        city,
        name
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        city,
        name
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
      lorry_receipts (
        id,
        lr_number,
        status,
        freight_amount,
        consignor_name,
        consignee_name
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as TripWithRelations) || null;
}

/**
 * Insert a new trip instance.
 */
export async function insertTrip(
  supabase: AnySupabaseClient,
  data: TripInsert
): Promise<TripRow> {
  const { data: newTrip, error } = await supabase
    .from('trips')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return newTrip;
}

/**
 * Update an existing trip instance.
 */
export async function updateTrip(
  supabase: AnySupabaseClient,
  id: string,
  data: TripUpdate
): Promise<TripRow> {
  const { data: updated, error } = await supabase
    .from('trips')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}
