'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { tripScheduleSchema, type TripScheduleInput } from '@/lib/validations/trip-schedule';
import {
  insertTripSchedule,
  updateTripSchedule,
  toggleTripScheduleActive,
  deleteTripSchedule,
} from '@/lib/db/trip-schedules';
import {
  type ActionResult,
  actionSuccess,
  validationError,
  formError,
} from '@/lib/types/action-result';

export async function createTripScheduleAction(
  data: TripScheduleInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = tripScheduleSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const newSchedule = await insertTripSchedule(supabase, {
      tenant_id: session.tenantId,
      from_hub_id: cleanData.from_hub_id,
      to_hub_id: cleanData.to_hub_id,
      days_of_week: cleanData.days_of_week,
      departure_time: cleanData.departure_time || null,
      vehicle_id: cleanData.vehicle_id || null,
      driver_id: cleanData.driver_id || null,
      is_active: cleanData.is_active,
    });

    revalidatePath('/trip-schedules');
    return actionSuccess({ id: newSchedule.id });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to create trip schedule. Please try again.'
    );
  }
}

export async function updateTripScheduleAction(
  id: string,
  data: TripScheduleInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(['fleet_owner']);
    const parsed = tripScheduleSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const updated = await updateTripSchedule(supabase, id, {
      from_hub_id: cleanData.from_hub_id,
      to_hub_id: cleanData.to_hub_id,
      days_of_week: cleanData.days_of_week,
      departure_time: cleanData.departure_time || null,
      vehicle_id: cleanData.vehicle_id || null,
      driver_id: cleanData.driver_id || null,
      is_active: cleanData.is_active,
    });

    revalidatePath('/trip-schedules');
    return actionSuccess({ id: updated.id });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update trip schedule. Please try again.'
    );
  }
}

export async function toggleTripScheduleStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    const updated = await toggleTripScheduleActive(supabase, id, isActive);

    revalidatePath('/trip-schedules');
    return actionSuccess({ id: updated.id, is_active: updated.is_active });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update schedule status. Please try again.'
    );
  }
}

export async function deleteTripScheduleAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    await deleteTripSchedule(supabase, id);

    revalidatePath('/trip-schedules');
    return actionSuccess({ id });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to delete schedule. Please try again.'
    );
  }
}
