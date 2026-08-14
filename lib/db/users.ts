import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];

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
): Promise<UserRow | null> {
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
