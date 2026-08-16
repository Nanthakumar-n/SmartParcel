'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { rejectBookingSchema, type RejectBookingInput } from '@/lib/validations/booking-request';
import { getBookingRequestById, updateBookingRequest } from '@/lib/db/booking-requests';
import {
  type ActionResult,
  validationError,
  formError,
  actionSuccessVoid,
} from '@/lib/types/action-result';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/supabase';

/**
 * Server Action to reject a customer booking request.
 */
export async function rejectBookingRequestAction(
  id: string,
  data: RejectBookingInput
): Promise<ActionResult> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = rejectBookingSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient() as unknown as SupabaseClient<Database>;

    // Fetch the booking request first to check ownership/existence
    const request = await getBookingRequestById(supabase, id);

    if (!request) {
      return formError('Booking request not found.');
    }

    if (request.status !== 'PENDING') {
      return formError(`Cannot reject booking. Status is already ${request.status}.`);
    }

    // Update status to REJECTED
    await updateBookingRequest(supabase, id, {
      status: 'REJECTED',
      rejection_reason: parsed.data.rejection_reason.trim(),
      processed_by: session.id,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    revalidatePath('/booking-requests');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to reject booking request.'
    );
  }
}
