import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

/**
 * Server-only Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for administrative operations (e.g. self-registration provisioning, inviting users).
 * NEVER expose or import this in client-side code.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
