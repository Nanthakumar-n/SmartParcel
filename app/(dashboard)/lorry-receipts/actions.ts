'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { lrCreateSchema, type LRCreateInput } from '@/lib/validations/lr';
import { createLRService } from '@/lib/services/lr';
import {
  type ActionResult,
  validationError,
  formError,
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
