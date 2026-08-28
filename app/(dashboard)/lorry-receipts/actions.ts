'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { lrCreateSchema, type LRCreateInput } from '@/lib/validations/lr';
import {
  deliveryConfirmationSchema,
  lrTransitionSchema,
  type DeliveryConfirmationInput,
  type LRTransitionInput,
} from '@/lib/validations/delivery';
import { createLRService } from '@/lib/services/lr';
import {
  confirmDeliveryService,
  transitionLRStatusService,
  getLRDeliverySummary,
} from '@/lib/services/delivery';
import {
  type ActionResult,
  validationError,
  formError,
  actionSuccess,
} from '@/lib/types/action-result';

export async function createLorryReceiptAction(
  data: LRCreateInput
): Promise<ActionResult<{ id: string; lr_number: string }>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = lrCreateSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const result = await createLRService(supabase, parsed.data, session);

    if (result.success) {
      revalidatePath('/lorry-receipts');
      revalidatePath('/lorry-receipts/new');
      revalidatePath('/booking-requests');
      revalidatePath('/dashboard');
    }

    return result;
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to create Lorry Receipt. Please try again.'
    );
  }
}

export async function confirmDeliveryAction(
  data: DeliveryConfirmationInput
): Promise<ActionResult<{ lrId: string; lrNumber: string }>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = deliveryConfirmationSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const result = await confirmDeliveryService(supabase, parsed.data, session);

    if (result.success) {
      revalidatePath('/lorry-receipts');
      revalidatePath('/dashboard');
      revalidatePath('/trip-dispatches');
    }

    return result;
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to confirm delivery. Please try again.'
    );
  }
}

export async function transitionLRStatusAction(
  data: LRTransitionInput
): Promise<ActionResult<{ lrId: string; nextStatus: string }>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = lrTransitionSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const result = await transitionLRStatusService(supabase, parsed.data, session);

    if (result.success) {
      revalidatePath('/lorry-receipts');
      revalidatePath('/dashboard');
      revalidatePath('/trip-dispatches');
    }

    return result;
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update status. Please try again.'
    );
  }
}

export async function getLRDeliveryDetailsAction(
  lrId: string
) {
  try {
    await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient();
    const summary = await getLRDeliverySummary(supabase, lrId);
    return actionSuccess(summary);
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to load delivery details'
    );
  }
}
