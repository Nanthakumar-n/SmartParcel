'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  inviteUserSchema,
  updateUserSchema,
  type InviteUserInput,
  type UpdateUserInput,
} from '@/lib/validations/user';
import { inviteUserService, updateUserService } from '@/lib/services/users';
import { toggleUserActive } from '@/lib/db/users';
import {
  type ActionResult,
  actionSuccess,
  validationError,
  formError,
} from '@/lib/types/action-result';

export async function inviteUserAction(
  data: InviteUserInput
): Promise<ActionResult<{ id: string; email: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = inviteUserSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await inviteUserService(parsed.data, session);
    if (result.success) {
      revalidatePath('/users');
    }
    return result;
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to invite user. Please try again.'
    );
  }
}

export async function updateUserAction(
  userId: string,
  data: UpdateUserInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const parsed = updateUserSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await updateUserService(userId, parsed.data, session);
    if (result.success) {
      revalidatePath('/users');
    }
    return result;
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update user. Please try again.'
    );
  }
}

export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean
): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  try {
    await requireRole(['fleet_owner']);
    const supabase = createServerClient();
    const updated = await toggleUserActive(supabase, userId, isActive);

    revalidatePath('/users');
    return actionSuccess({ id: updated.id, is_active: updated.is_active });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to update user status. Please try again.'
    );
  }
}
