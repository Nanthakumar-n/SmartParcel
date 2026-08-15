import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type TripScheduleRow = Database['public']['Tables']['trip_schedules']['Row'];
export type TripScheduleInsert = Database['public']['Tables']['trip_schedules']['Insert'];
export type TripScheduleUpdate = Database['public']['Tables']['trip_schedules']['Update'];

export interface TripScheduleWithDetails extends TripScheduleRow {
  from_hub: {
    id: string;
    hub_code: string;
    name: string;
    city: string;
  } | null;
  to_hub: {
    id: string;
    hub_code: string;
    name: string;
    city: string;
  } | null;
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Get all trip schedules for the tenant with joined hub, vehicle, and driver details.
 */
export async function getTripSchedulesByTenant(
  supabase: AnySupabaseClient,
  options?: {
    fromHubId?: string;
    toHubId?: string;
    isActive?: boolean;
  }
): Promise<{ data: TripScheduleWithDetails[]; count: number }> {
  let query = supabase
    .from('trip_schedules')
    .select(
      `
      id,
      from_hub_id,
      to_hub_id,
      days_of_week,
      departure_time,
      vehicle_id,
      driver_id,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        name,
        city
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        name,
        city
      ),
      vehicle:vehicles (
        id,
        registration_number,
        vehicle_type
      ),
      driver:drivers (
        id,
        full_name,
        phone
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (options?.fromHubId) {
    query = query.eq('from_hub_id', options.fromHubId);
  }
  if (options?.toHubId) {
    query = query.eq('to_hub_id', options.toHubId);
  }
  if (options?.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: (data as unknown as TripScheduleWithDetails[]) ?? [],
    count: count ?? 0,
  };
}

/**
 * Get a single trip schedule by ID.
 */
export async function getTripScheduleById(
  supabase: AnySupabaseClient,
  id: string
): Promise<TripScheduleWithDetails | null> {
  const { data, error } = await supabase
    .from('trip_schedules')
    .select(
      `
      id,
      from_hub_id,
      to_hub_id,
      days_of_week,
      departure_time,
      vehicle_id,
      driver_id,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      from_hub:hubs!from_hub_id (
        id,
        hub_code,
        name,
        city
      ),
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        name,
        city
      ),
      vehicle:vehicles (
        id,
        registration_number,
        vehicle_type
      ),
      driver:drivers (
        id,
        full_name,
        phone
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as TripScheduleWithDetails | null;
}

/**
 * Insert a new trip schedule.
 */
export async function insertTripSchedule(
  supabase: AnySupabaseClient,
  schedule: TripScheduleInsert
): Promise<TripScheduleRow> {
  const { data, error } = await supabase
    .from('trip_schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update an existing trip schedule.
 */
export async function updateTripSchedule(
  supabase: AnySupabaseClient,
  id: string,
  schedule: TripScheduleUpdate
): Promise<TripScheduleRow> {
  const { data, error } = await supabase
    .from('trip_schedules')
    .update({ ...schedule, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle active status of a trip schedule.
 */
export async function toggleTripScheduleActive(
  supabase: AnySupabaseClient,
  id: string,
  isActive: boolean
): Promise<TripScheduleRow> {
  const { data, error } = await supabase
    .from('trip_schedules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a trip schedule.
 */
export async function deleteTripSchedule(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('trip_schedules').delete().eq('id', id);

  if (error) {
    throw error;
  }
}
