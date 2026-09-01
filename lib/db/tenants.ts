import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type TenantRow = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Get tenant by slug (public lookup for booking form / registration collision check).
 */
export async function getTenantBySlug(
  supabase: AnySupabaseClient,
  slug: string
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, gstin, contact_phone, address_line1, city, state, pin_code, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Get tenant by ID.
 */
export async function getTenantById(
  supabase: AnySupabaseClient,
  id: string
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, gstin, contact_phone, address_line1, city, state, pin_code, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Insert a new tenant.
 */
export async function insertTenant(
  supabase: AnySupabaseClient,
  tenantData: TenantInsert
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenantData)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Update tenant profile details.
 */
export async function updateTenant(
  supabase: AnySupabaseClient,
  id: string,
  updates: Database['public']['Tables']['tenants']['Update']
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug, gstin, contact_phone, address_line1, city, state, pin_code, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }
  return data;
}



