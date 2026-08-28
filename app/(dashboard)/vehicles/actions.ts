'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { vehicleSchema, type VehicleInput } from '@/lib/validations/vehicle';
import { insertVehicle, updateVehicle, toggleVehicleActive } from '@/lib/db/vehicles';
import { formatVehicleNumber } from '@/lib/utils/format-vehicle';
import {
  type ActionResult,
  actionSuccess,
  actionError,
  validationError,
  formError,
} from '@/lib/types/action-result';

export async function createVehicleAction(
  data: VehicleInput
): Promise<ActionResult<{ id: string; registration_number: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = vehicleSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const capacityNum = cleanData.capacity_tonnes && cleanData.capacity_tonnes.trim() !== ''
      ? Number(cleanData.capacity_tonnes)
      : null;

    const driverId = cleanData.default_driver_id && cleanData.default_driver_id.trim() !== ''
      ? cleanData.default_driver_id
      : null;

    const currentHubId = cleanData.current_hub_id && cleanData.current_hub_id.trim() !== ''
      ? cleanData.current_hub_id
      : null;

    const newVehicle = await insertVehicle(supabase, {
      tenant_id: session.tenantId,
      registration_number: formatVehicleNumber(cleanData.registration_number),
      vehicle_type: cleanData.vehicle_type,
      capacity_tonnes: capacityNum,
      default_driver_id: driverId,
      current_hub_id: currentHubId,
      status: cleanData.status,
      is_active: cleanData.is_active,
    });

    revalidatePath('/vehicles');
    revalidatePath('/hubs');
    return actionSuccess({
      id: newVehicle.id,
      registration_number: newVehicle.registration_number,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return actionError(
        'registration_number',
        'A vehicle with this registration number already exists in your fleet'
      );
    }
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to add vehicle. Please try again.'
    );
  }
}

export async function updateVehicleAction(
  id: string,
  data: VehicleInput
): Promise<ActionResult<{ id: string; registration_number: string }>> {
  try {
    await requireRole(['fleet_owner']);
    const parsed = vehicleSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const capacityNum = cleanData.capacity_tonnes && cleanData.capacity_tonnes.trim() !== ''
      ? Number(cleanData.capacity_tonnes)
      : null;

    const driverId = cleanData.default_driver_id && cleanData.default_driver_id.trim() !== ''
      ? cleanData.default_driver_id
      : null;

    const currentHubId = cleanData.current_hub_id && cleanData.current_hub_id.trim() !== ''
      ? cleanData.current_hub_id
      : null;

    const updated = await updateVehicle(supabase, id, {
      registration_number: formatVehicleNumber(cleanData.registration_number),
      vehicle_type: cleanData.vehicle_type,
      capacity_tonnes: capacityNum,
      default_driver_id: driverId,
      current_hub_id: currentHubId,
      status: cleanData.status,
      is_active: cleanData.is_active,
    });

    revalidatePath('/vehicles');
    return actionSuccess({
      id: updated.id,
      registration_number: updated.registration_number,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return actionError(
        'registration_number',
        'A vehicle with this registration number already exists in your fleet'
      );
    }
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update vehicle. Please try again.'
    );
  }
}

export async function toggleVehicleStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    const updated = await toggleVehicleActive(supabase, id, isActive);

    revalidatePath('/vehicles');
    return actionSuccess({ id: updated.id, is_active: updated.is_active });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update vehicle status. Please try again.'
    );
  }
}
