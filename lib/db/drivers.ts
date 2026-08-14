import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type DriverRow = Database['public']['Tables']['drivers']['Row'];
export type DriverInsert = Database['public']['Tables']['drivers']['Insert'];
export type DriverUpdate = Database['public']['Tables']['drivers']['Update'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetDriversOptions {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Get all drivers for current tenant with optional search, active filter, and pagination.
 */
export async function getDriversByTenant(
  supabase: AnySupabaseClient,
  options: GetDriversOptions = {}
): Promise<{ data: DriverRow[]; count: number }> {
  const { search, isActive, page = 0, pageSize = 50 } = options;

  let query = supabase
    .from('drivers')
    .select('id, full_name, phone, license_number, is_active, tenant_id, created_at, updated_at', { count: 'exact' })
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true });

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,license_number.ilike.%${term}%`);
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
 * Get single driver by ID.
 */
export async function getDriverById(
  supabase: AnySupabaseClient,
  id: string
): Promise<DriverRow | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, full_name, phone, license_number, is_active, tenant_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Insert a new driver.
 */
export async function insertDriver(
  supabase: AnySupabaseClient,
  driverData: DriverInsert
): Promise<DriverRow> {
  const { data, error } = await supabase
    .from('drivers')
    .insert(driverData)
    .select('id, full_name, phone, license_number, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update an existing driver.
 */
export async function updateDriver(
  supabase: AnySupabaseClient,
  id: string,
  driverData: DriverUpdate
): Promise<DriverRow> {
  const { data, error } = await supabase
    .from('drivers')
    .update({ ...driverData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, full_name, phone, license_number, is_active, tenant_id, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle driver active status.
 */
export async function toggleDriverActive(
  supabase: AnySupabaseClient,
  id: string,
  isActive: boolean
): Promise<DriverRow> {
  return updateDriver(supabase, id, { is_active: isActive });
}
