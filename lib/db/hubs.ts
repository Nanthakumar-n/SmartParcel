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
