import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

export type BookingRequestRow = Database['public']['Tables']['booking_requests']['Row'];
export type BookingRequestInsert = Database['public']['Tables']['booking_requests']['Insert'];
export type BookingRequestUpdate = Database['public']['Tables']['booking_requests']['Update'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export interface GetBookingRequestsOptions {
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  page?: number;
  pageSize?: number;
}

/**
 * Fetch booking requests for tenant with pagination and optional status filter.
 */
export async function getBookingRequestsByTenant(
  supabase: AnySupabaseClient,
  options: GetBookingRequestsOptions = {}
): Promise<{ data: BookingRequestRow[]; count: number }> {
  const { status, page = 0, pageSize = 50 } = options;

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const fromRange = page * pageSize;
  const toRange = (page + 1) * pageSize - 1;
  const { data, count, error } = await query.range(fromRange, toRange);

  if (error) throw error;
  return {
    data: data || [],
    count: count || 0,
  };
}

/**
 * Fetch a single booking request by ID.
 */
export async function getBookingRequestById(
  supabase: AnySupabaseClient,
  id: string
): Promise<BookingRequestRow | null> {
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Insert a booking request (used anonymously by public form).
 */
export async function insertBookingRequest(
  supabase: AnySupabaseClient,
  data: BookingRequestInsert
): Promise<BookingRequestRow> {
  const { data: newRequest, error } = await supabase
    .from('booking_requests')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return newRequest;
}

/**
 * Update booking request (e.g. associate with LR, change status, etc.).
 */
export async function updateBookingRequest(
  supabase: AnySupabaseClient,
  id: string,
  data: BookingRequestUpdate
): Promise<BookingRequestRow> {
  const { data: updated, error } = await supabase
    .from('booking_requests')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}
