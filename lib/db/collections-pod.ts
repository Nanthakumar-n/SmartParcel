import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type PODRow = Database['public']['Tables']['proof_of_deliveries']['Row'];
export type PODInsert = Database['public']['Tables']['proof_of_deliveries']['Insert'];

export type CollectionRow = Database['public']['Tables']['to_pay_collections']['Row'];
export type CollectionInsert = Database['public']['Tables']['to_pay_collections']['Insert'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Insert a Proof of Delivery (POD) record.
 */
export async function insertPOD(
  supabase: AnySupabaseClient,
  podData: PODInsert
): Promise<PODRow> {
  const { data, error } = await supabase
    .from('proof_of_deliveries')
    .insert(podData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get the Proof of Delivery (POD) record for a given LR.
 */
export async function getPODByLRId(
  supabase: AnySupabaseClient,
  lrId: string
): Promise<PODRow | null> {
  const { data, error } = await supabase
    .from('proof_of_deliveries')
    .select('id, lr_id, receiver_name, delivered_at, photo_url, notes, tenant_id, created_at')
    .eq('lr_id', lrId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Insert a To-Pay collection record.
 */
export async function insertToPayCollection(
  supabase: AnySupabaseClient,
  collectionData: CollectionInsert
): Promise<CollectionRow> {
  const { data, error } = await supabase
    .from('to_pay_collections')
    .insert(collectionData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get the To-Pay collection record for a given LR.
 */
export async function getToPayCollectionByLRId(
  supabase: AnySupabaseClient,
  lrId: string
): Promise<CollectionRow | null> {
  const { data, error } = await supabase
    .from('to_pay_collections')
    .select('id, lr_id, collected, amount_collected, collected_by, collected_at, payment_mode, notes, tenant_id, created_at, updated_at')
    .eq('lr_id', lrId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
