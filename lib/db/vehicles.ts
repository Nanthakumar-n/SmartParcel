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
      status,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      driver:drivers!default_driver_id (
        id,
        full_name,
        phone
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
      status,
      is_active,
      tenant_id,
      created_at,
      updated_at,
      driver:drivers!default_driver_id (
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
    .select('id, registration_number, vehicle_type, capacity_tonnes, default_driver_id, status, is_active, tenant_id, created_at, updated_at')
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
    .select('id, registration_number, vehicle_type, capacity_tonnes, default_driver_id, status, is_active, tenant_id, created_at, updated_at')
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
