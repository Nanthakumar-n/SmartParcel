import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface UserWithHubs extends UserRow {
  user_hub_assignments: {
    hub_id: string;
    hub: {
      id: string;
      hub_code: string;
      name: string;
      city: string;
    } | null;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Get user profile by Auth user ID.
 */
export async function getUserProfile(
  supabase: AnySupabaseClient,
  userId: string
): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, phone, full_name, user_role, tenant_id, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Insert a user profile in public.users.
 */
export async function insertUserProfile(
  supabase: AnySupabaseClient,
  userProfile: UserInsert
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .insert(userProfile)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Get all users for the tenant with their assigned hub details.
 */
export async function getUsersByTenant(
  supabase: AnySupabaseClient
): Promise<UserWithHubs[]> {
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      phone,
      full_name,
      user_role,
      tenant_id,
      is_active,
      created_at,
      updated_at,
      user_hub_assignments (
        hub_id,
        hub:hubs (
          id,
          hub_code,
          name,
          city
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as unknown as UserWithHubs[]) ?? [];
}

/**
 * Get a single user by ID with assigned hubs.
 */
export async function getUserWithHubs(
  supabase: AnySupabaseClient,
  userId: string
): Promise<UserWithHubs | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      phone,
      full_name,
      user_role,
      tenant_id,
      is_active,
      created_at,
      updated_at,
      user_hub_assignments (
        hub_id,
        hub:hubs (
          id,
          hub_code,
          name,
          city
        )
      )
    `
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as UserWithHubs | null;
}

/**
 * Update user record in public.users.
 */
export async function updateUserRecord(
  supabase: AnySupabaseClient,
  userId: string,
  updates: UserUpdate
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle user active status.
 */
export async function toggleUserActive(
  supabase: AnySupabaseClient,
  userId: string,
  isActive: boolean
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Set user hub assignments (replaces existing assignments).
 */
export async function setUserHubAssignments(
  supabase: AnySupabaseClient,
  userId: string,
  tenantId: string,
  hubIds: string[]
): Promise<void> {
  // Delete existing assignments for this user
  const { error: deleteError } = await supabase
    .from('user_hub_assignments')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw deleteError;
  }

  // Insert new assignments if any
  if (hubIds.length > 0) {
    const rows = hubIds.map((hubId) => ({
      user_id: userId,
      hub_id: hubId,
      tenant_id: tenantId,
    }));

    const { error: insertError } = await supabase
      .from('user_hub_assignments')
      .insert(rows);

    if (insertError) {
      throw insertError;
    }
  }
}
