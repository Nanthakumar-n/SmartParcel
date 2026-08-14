'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { driverSchema, type DriverInput } from '@/lib/validations/driver';
import { insertDriver, updateDriver, toggleDriverActive } from '@/lib/db/drivers';
import { normalizePhone } from '@/lib/utils/format-phone';
import {
  type ActionResult,
  actionSuccess,
  validationError,
  formError,
} from '@/lib/types/action-result';

export async function createDriverAction(
  data: DriverInput
): Promise<ActionResult<{ id: string; full_name: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = driverSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const newDriver = await insertDriver(supabase, {
      tenant_id: session.tenantId,
      full_name: cleanData.full_name.trim(),
      phone: normalizePhone(cleanData.phone),
      license_number: cleanData.license_number ? cleanData.license_number.toUpperCase().trim() : null,
      is_active: cleanData.is_active,
    });

    revalidatePath('/drivers');
    revalidatePath('/vehicles');
    return actionSuccess({ id: newDriver.id, full_name: newDriver.full_name });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to register driver. Please try again.'
    );
  }
}

export async function updateDriverAction(
  id: string,
  data: DriverInput
): Promise<ActionResult<{ id: string; full_name: string }>> {
  try {
    await requireRole(['fleet_owner']);
    const parsed = driverSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const updated = await updateDriver(supabase, id, {
      full_name: cleanData.full_name.trim(),
      phone: normalizePhone(cleanData.phone),
      license_number: cleanData.license_number ? cleanData.license_number.toUpperCase().trim() : null,
      is_active: cleanData.is_active,
    });

    revalidatePath('/drivers');
    revalidatePath('/vehicles');
    return actionSuccess({ id: updated.id, full_name: updated.full_name });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update driver profile. Please try again.'
    );
  }
}

export async function toggleDriverStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    const updated = await toggleDriverActive(supabase, id, isActive);

    revalidatePath('/drivers');
    revalidatePath('/vehicles');
    return actionSuccess({ id: updated.id, is_active: updated.is_active });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update driver status. Please try again.'
    );
  }
}
