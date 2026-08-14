'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { hubSchema, type HubInput } from '@/lib/validations/hub';
import { insertHub, updateHub, toggleHubActive } from '@/lib/db/hubs';
import { normalizePhone } from '@/lib/utils/format-phone';
import {
  type ActionResult,
  actionSuccess,
  actionError,
  validationError,
  formError,
} from '@/lib/types/action-result';

export async function createHubAction(
  data: HubInput
): Promise<ActionResult<{ id: string; hub_code: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = hubSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const lat = cleanData.latitude && cleanData.latitude.trim() !== '' ? Number(cleanData.latitude) : null;
    const lng = cleanData.longitude && cleanData.longitude.trim() !== '' ? Number(cleanData.longitude) : null;

    const newHub = await insertHub(supabase, {
      tenant_id: session.tenantId,
      hub_code: cleanData.hub_code.toUpperCase().trim(),
      name: cleanData.name.trim(),
      address_line1: cleanData.address_line1.trim(),
      city: cleanData.city.trim(),
      state: cleanData.state.trim(),
      pin_code: cleanData.pin_code.trim(),
      contact_phone: normalizePhone(cleanData.contact_phone),
      latitude: lat,
      longitude: lng,
      is_active: cleanData.is_active,
    });

    revalidatePath('/hubs');
    return actionSuccess({ id: newHub.id, hub_code: newHub.hub_code });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return actionError('hub_code', 'A hub with this code already exists in your fleet');
    }
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to create hub. Please try again.'
    );
  }
}

export async function updateHubAction(
  id: string,
  data: HubInput
): Promise<ActionResult<{ id: string; hub_code: string }>> {
  try {
    await requireRole(['fleet_owner']);
    const parsed = hubSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const cleanData = parsed.data;

    const lat = cleanData.latitude && cleanData.latitude.trim() !== '' ? Number(cleanData.latitude) : null;
    const lng = cleanData.longitude && cleanData.longitude.trim() !== '' ? Number(cleanData.longitude) : null;

    const updated = await updateHub(supabase, id, {
      hub_code: cleanData.hub_code.toUpperCase().trim(),
      name: cleanData.name.trim(),
      address_line1: cleanData.address_line1.trim(),
      city: cleanData.city.trim(),
      state: cleanData.state.trim(),
      pin_code: cleanData.pin_code.trim(),
      contact_phone: normalizePhone(cleanData.contact_phone),
      latitude: lat,
      longitude: lng,
      is_active: cleanData.is_active,
    });

    revalidatePath('/hubs');
    return actionSuccess({ id: updated.id, hub_code: updated.hub_code });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return actionError('hub_code', 'A hub with this code already exists in your fleet');
    }
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update hub. Please try again.'
    );
  }
}

export async function toggleHubStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    const updated = await toggleHubActive(supabase, id, isActive);

    revalidatePath('/hubs');
    return actionSuccess({ id: updated.id, is_active: updated.is_active });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update hub status. Please try again.'
    );
  }
}
