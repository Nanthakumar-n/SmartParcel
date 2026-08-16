'use server';

import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantBySlug } from '@/lib/db/tenants';
import { insertBookingRequest } from '@/lib/db/booking-requests';
import { customerBookingSchema, type CustomerBookingInput } from '@/lib/validations/booking-request';
import { normalizePhone } from '@/lib/utils/format-phone';
import {
  type ActionResult,
  validationError,
  formError,
  actionSuccess,
} from '@/lib/types/action-result';

/**
 * Server Action to submit a public booking request.
 */
export async function submitBookingRequestAction(
  tenantSlug: string,
  data: CustomerBookingInput
): Promise<ActionResult<{ bookingRef: string; companyName: string }>> {
  try {
    const parsed = customerBookingSchema.safeParse(data);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabaseAdmin = createAdminClient();

    // 1. Resolve tenant by slug
    const tenant = await getTenantBySlug(supabaseAdmin, tenantSlug);
    if (!tenant) {
      return formError('Logistics company not found. Please verify the URL.');
    }

    // 2. Normalize customer phone number
    const normalizedPhone = normalizePhone(parsed.data.customer_phone);

    const pkgs = parseInt(parsed.data.num_packages, 10) || 1;
    const weight =
      parsed.data.weight_kg && parsed.data.weight_kg.trim() !== ''
        ? parseFloat(parsed.data.weight_kg)
        : null;

    // 3. Create booking request record
    const bookingRef = 'BK-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const newRequest = await insertBookingRequest(supabaseAdmin, {
      tenant_id: tenant.id,
      tenant_slug: tenantSlug,
      booking_ref: bookingRef,
      customer_name: parsed.data.customer_name.trim(),
      customer_phone: normalizedPhone,
      origin_city: parsed.data.origin_city.trim(),
      destination_city: parsed.data.destination_city.trim(),
      goods_description: parsed.data.goods_description.trim(),
      quantity: pkgs,
      weight_kg: weight,
      num_packages: pkgs,
      status: 'PENDING',
    });

    return actionSuccess({
      bookingRef: newRequest.booking_ref,
      companyName: tenant.name,
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to submit booking request.'
    );
  }
}
