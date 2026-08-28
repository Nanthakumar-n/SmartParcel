import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export interface VehicleWithDriver extends VehicleRow {
  driver?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  current_hub?: {
    id: string;
    hub_code: string;
    name: string;
    city: string;
  } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetVehiclesOptions {
  search?: string;
  status?: 'AVAILABLE' | 'IN_TRANSIT' | 'UNDER_MAINTENANCE';
  vehicleType?: 'TRUCK' | 'MINI_TRUCK' | 'TEMPO';
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Get all vehicles for current tenant with joined driver info, search, status, and type filters.
 */
export async function getVehiclesByTenant(
  supabase: AnySupabaseClient,
  options: GetVehiclesOptions = {}
): Promise<{ data: VehicleWithDriver[]; count: number }> {
  const { search, status, vehicleType, isActive, page = 0, pageSize = 50 } = options;

  let query = supabase
    .from('vehicles')
    .select(
      `
      id,
      registration_number,
      vehicle_type,
      capacity_tonnes,
      default_driver_id,
      current_hub_id,
      status,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      driver:drivers!default_driver_id (
        id,
        full_name,
        phone
      ),
      current_hub:hubs!current_hub_id (
        id,
        hub_code,
        name,
        city
      )
    `,
      { count: 'exact' }
    )
    .order('is_active', { ascending: false })
    .order('registration_number', { ascending: true });

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (vehicleType) {
    query = query.eq('vehicle_type', vehicleType);
  }

  if (search && search.trim() !== '') {
    const term = search.trim().toUpperCase();
    query = query.or(`registration_number.ilike.%${term}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return { data: (data as unknown as VehicleWithDriver[]) ?? [], count: count ?? 0 };
}

/**
 * Get single vehicle by ID.
 */
export async function getVehicleById(
  supabase: AnySupabaseClient,
  id: string
): Promise<VehicleWithDriver | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `
      id,
      registration_number,
      vehicle_type,
      capacity_tonnes,
      default_driver_id,
      current_hub_id,
      status,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      driver:drivers!default_driver_id (
        id,
        full_name,
        phone
      ),
      current_hub:hubs!current_hub_id (
        id,
        hub_code,
        name,
        city
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as unknown as VehicleWithDriver) ?? null;
}

/**
 * Insert a new vehicle.
 */
export async function insertVehicle(
  supabase: AnySupabaseClient,
  vehicleData: VehicleInsert
): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicleData)
    .select('id, registration_number, vehicle_type, capacity_tonnes, default_driver_id, current_hub_id, status, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update an existing vehicle.
 */
export async function updateVehicle(
  supabase: AnySupabaseClient,
  id: string,
  vehicleData: VehicleUpdate
): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ ...vehicleData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, registration_number, vehicle_type, capacity_tonnes, default_driver_id, current_hub_id, status, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle vehicle active status.
 */
export async function toggleVehicleActive(
  supabase: AnySupabaseClient,
  id: string,
  isActive: boolean
): Promise<VehicleRow> {
  return updateVehicle(supabase, id, { is_active: isActive });
}

/**
 * Update vehicle status — called automatically on trip lifecycle events:
 *   Trip Dispatch   → IN_TRANSIT
 *   Trip Arrived    → AVAILABLE
 *   Trip Cancelled  → AVAILABLE
 */
export async function updateVehicleStatus(
  supabase: AnySupabaseClient,
  vehicleId: string,
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'UNDER_MAINTENANCE'
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', vehicleId);

  if (error) throw error;
}

/**
 * Update vehicle current stationed hub and status — called automatically when a trip arrives/completes.
 */
export async function updateVehicleLocationAndStatus(
  supabase: AnySupabaseClient,
  vehicleId: string,
  currentHubId: string | null,
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'UNDER_MAINTENANCE'
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({
      current_hub_id: currentHubId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}

export interface AvailableVehicleOption extends VehicleWithDriver {
  currentLocationHub?: {
    id: string;
    hub_code: string;
    city: string;
  } | null;
  isAtOrigin: boolean;
}

/**
 * Fetches vehicles available for assignment at a specific origin hub.
 * A vehicle is available if:
 * 1. is_active = true
 * 2. status = 'AVAILABLE' (or matches currentVehicleId)
 * 3. Not assigned to another SCHEDULED trip
 * 4. Location matches originHubId (either current_hub_id matches, last completed trip destination was originHubId, or new vehicle with 0 completed trips)
 */
export async function getAvailableVehiclesForOrigin(
  supabase: AnySupabaseClient,
  originHubId: string,
  currentTripId?: string,
  currentVehicleId?: string
): Promise<AvailableVehicleOption[]> {
  // 1. Fetch active vehicles with AVAILABLE status (or current vehicle)
  let query = supabase
    .from('vehicles')
    .select(
      `
      id,
      registration_number,
      vehicle_type,
      capacity_tonnes,
      default_driver_id,
      current_hub_id,
      status,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      driver:drivers!default_driver_id (
        id,
        full_name,
        phone
      ),
      current_hub:hubs!current_hub_id (
        id,
        hub_code,
        city
      )
    `
    )
    .eq('is_active', true);

  if (currentVehicleId) {
    query = query.or(`status.eq.AVAILABLE,id.eq.${currentVehicleId}`);
  } else {
    query = query.eq('status', 'AVAILABLE');
  }

  const { data: vehicles, error: vehiclesError } = await query;
  if (vehiclesError) throw vehiclesError;
  if (!vehicles || vehicles.length === 0) return [];

  const vehicleIds = vehicles.map((v) => v.id);

  // 2. Check which vehicles are currently assigned to other SCHEDULED trips
  const { data: scheduledTrips, error: scheduledError } = await supabase
    .from('trips')
    .select('id, vehicle_id')
    .in('vehicle_id', vehicleIds)
    .eq('status', 'SCHEDULED');

  if (scheduledError) throw scheduledError;

  const busyVehicleIds = new Set(
    (scheduledTrips || [])
      .filter((t) => !currentTripId || t.id !== currentTripId)
      .map((t) => t.vehicle_id)
      .filter(Boolean)
  );

  // 3. Find latest completed trip for each vehicle to determine current hub location if current_hub_id is null
  const { data: completedTrips, error: tripsError } = await supabase
    .from('trips')
    .select(
      `
      vehicle_id,
      to_hub_id,
      completed_at,
      to_hub:hubs!to_hub_id (
        id,
        hub_code,
        city
      )
    `
    )
    .in('vehicle_id', vehicleIds)
    .eq('status', 'COMPLETED')
    .order('completed_at', { ascending: false });

  if (tripsError) throw tripsError;

  interface CompletedTripLocation {
    vehicle_id: string | null;
    to_hub_id: string;
    completed_at: string | null;
    to_hub: {
      id: string;
      hub_code: string;
      city: string;
    } | null;
  }

  // Map each vehicle to its latest completed trip
  const latestTripMap = new Map<string, CompletedTripLocation>();
  for (const t of (completedTrips as unknown as CompletedTripLocation[]) || []) {
    if (t.vehicle_id && !latestTripMap.has(t.vehicle_id)) {
      latestTripMap.set(t.vehicle_id, t);
    }
  }

  const result: AvailableVehicleOption[] = [];

  for (const v of vehicles as unknown as VehicleWithDriver[]) {
    // Skip if vehicle is busy with another scheduled trip (and not the currently assigned one)
    if (busyVehicleIds.has(v.id) && v.id !== currentVehicleId) {
      continue;
    }

    if (v.current_hub_id && v.current_hub) {
      const isAtOrigin = v.current_hub_id === originHubId;
      if (isAtOrigin || v.id === currentVehicleId) {
        result.push({
          ...v,
          currentLocationHub: v.current_hub,
          isAtOrigin,
        });
      }
    } else {
      const lastTrip = latestTripMap.get(v.id);
      if (lastTrip) {
        const isAtOrigin = lastTrip.to_hub_id === originHubId;
        if (isAtOrigin || v.id === currentVehicleId) {
          result.push({
            ...v,
            currentLocationHub: lastTrip.to_hub,
            isAtOrigin,
          });
        }
      } else {
        // No prior completed trips and no explicit hub: available at any hub
        result.push({
          ...v,
          currentLocationHub: null,
          isAtOrigin: true,
        });
      }
    }
  }

  return result;
}

