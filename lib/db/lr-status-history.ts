import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export type StatusHistoryInsert =
  Database['public']['Tables']['lr_status_history']['Insert'];

/**
 * Insert a single immutable LR status history row.
 * Called whenever an LR transitions from one status to another.
 */
export async function insertStatusHistory(
  supabase: AnySupabaseClient,
  row: StatusHistoryInsert
): Promise<void> {
  const { error } = await supabase
    .from('lr_status_history')
    .insert(row);

  if (error) throw error;
}

/**
 * Insert multiple immutable LR status history rows in a single DB call.
 * Used for bulk operations (e.g. loading all LRs on a trip at once).
 */
export async function insertStatusHistoryBulk(
  supabase: AnySupabaseClient,
  rows: StatusHistoryInsert[]
): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('lr_status_history')
    .insert(rows);

  if (error) throw error;
}
