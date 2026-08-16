import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import { normalizePhone } from '@/lib/utils/format-phone';
import { insertLR } from '@/lib/db/lorry-receipts';
import { getUserHubIds, type UserSession } from '@/lib/auth/session';
import type { LRCreateInput } from '@/lib/validations/lr';
import {
  type ActionResult,
  actionSuccess,
  actionError,
  formError,
} from '@/lib/types/action-result';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

export async function createLRService(
  supabase: AnySupabaseClient,
  input: LRCreateInput,
  session: UserSession
): Promise<ActionResult<{ id: string; lr_number: string }>> {
  // 1. Enforce hub scoping for Hub Managers
  if (session.role === 'hub_manager') {
    const assignedHubIds = await getUserHubIds(session.id);
    if (!assignedHubIds.includes(input.from_hub_id)) {
      return actionError(
        'from_hub_id',
        'You can only create Lorry Receipts from your assigned hub branches'
      );
    }
  }

  // 2. Normalize Indian phone numbers
  const consignorPhone = normalizePhone(input.consignor_phone);
  const consigneePhone = normalizePhone(input.consignee_phone);

  // 3. Convert Rupees into integer paise (1 INR = 100 paise)
  const freightPaise = Math.round(parseFloat(input.freight_amount_rupees) * 100);

  const weightKg =
    input.weight_kg && input.weight_kg.trim() !== ''
      ? parseFloat(input.weight_kg)
      : null;

  const quantity = parseInt(input.quantity, 10) || 1;
  const numPackages = parseInt(input.num_packages, 10) || 1;

  try {
    const isBookingRequest = !!input.booking_request_id;

    // 4. Insert LR into database (trigger automatically generates lr_number)
    const newLR = await insertLR(supabase, {
      booking_date: input.booking_date,
      source: isBookingRequest ? 'CUSTOMER_REQUEST' : 'HUB_DIRECT',
      from_hub_id: input.from_hub_id,
      to_hub_id: input.to_hub_id,
      trip_id: input.trip_id || null,
      consignor_name: input.consignor_name.trim(),
      consignor_phone: consignorPhone,
      consignor_gstin: input.consignor_gstin || null,
      consignee_name: input.consignee_name.trim(),
      consignee_phone: consigneePhone,
      consignee_gstin: input.consignee_gstin || null,
      consignor_address_line1: input.consignor_address_line1 || null,
      consignor_address_line2: input.consignor_address_line2 || null,
      consignor_pin_code: input.consignor_pin_code || null,
      consignee_address_line1: input.consignee_address_line1 || null,
      consignee_address_line2: input.consignee_address_line2 || null,
      consignee_pin_code: input.consignee_pin_code || null,
      goods_description: input.goods_description.trim(),
      quantity,
      weight_kg: weightKg,
      num_packages: numPackages,
      freight_amount: freightPaise,
      payment_mode: input.payment_mode,
      expected_delivery_date: input.expected_delivery_date || null,
      status: 'BOOKED',
      booking_request_id: input.booking_request_id || null,
      tenant_id: session.tenantId,
      created_by: session.id,
    });

    // 5. Append initial transition audit trail in lr_status_history
    await supabase.from('lr_status_history').insert({
      lr_id: newLR.id,
      from_status: isBookingRequest ? 'BOOKING_PENDING' : 'BOOKING_PENDING',
      to_status: 'BOOKED',
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: isBookingRequest
        ? `Accepted online booking request ${input.booking_request_id}`
        : 'Direct LR issued at origin hub',
      tenant_id: session.tenantId,
    });

    // 6. Update the booking request status and link it to the LR
    if (isBookingRequest) {
      const { error: bookingUpdateError } = await supabase
        .from('booking_requests')
        .update({
          status: 'ACCEPTED',
          lr_id: newLR.id,
          processed_by: session.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.booking_request_id!);

      if (bookingUpdateError) {
        throw new Error(`Failed to update booking request status: ${bookingUpdateError.message}`);
      }
    }

    return actionSuccess({
      id: newLR.id,
      lr_number: newLR.lr_number ?? '',
    });
  } catch (error: unknown) {
    return formError(
      error instanceof Error ? error.message : 'Failed to create Lorry Receipt'
    );
  }
}
