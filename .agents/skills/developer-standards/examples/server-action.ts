// ===========================================================
// app/(dashboard)/lorry-receipts/actions.ts
// Reference Server Action showing the 3-layer pattern
// ===========================================================
//
// Layer 1: SERVER ACTION (this file)
//   - Parse input with zod
//   - Call service layer
//   - Return ActionResult<T>
//   - Wrap in try/catch with Sentry
//
// Layer 2: SERVICE (lib/services/lr.ts)
//   - Business logic, validation, orchestration
//
// Layer 3: DB HELPER (lib/db/lr.ts)
//   - Typed Supabase queries
//
// ✅ Notice: No Supabase .from() calls in this file.
// ✅ Notice: No business logic in this file.
// ✅ Notice: Function is under 50 lines.

'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { lrCreateSchema } from '@/lib/validations/lr';
import { createLR } from '@/lib/services/lr';
import { formError, type ActionResult } from '@/lib/types/action-result';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';

/**
 * Server Action: Create a new Lorry Receipt.
 *
 * Allowed roles: fleet_owner, hub_manager
 * Hub managers can only create LRs for their assigned hubs.
 */
export async function createLorryReceipt(
  formData: FormData
): Promise<ActionResult<{ id: string; lrNumber: string }>> {
  try {
    // 1. Auth + role check (always first line)
    const session = await requireRole(['fleet_owner', 'hub_manager']);

    // 2. Parse + validate input
    const parsed = lrCreateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    // 3. Call service layer (all business logic lives there)
    const supabase = createServerClient();
    const result = await createLR(supabase, {
      input: parsed.data,
      userId: session.userId,
      tenantId: session.tenantId,
      userRole: session.userRole,
      userHubIds: session.hubIds,
    });

    // 4. Handle service result
    if (!result.success) return result;

    // 5. Revalidate cache + return
    revalidatePath('/lorry-receipts');
    return result;
  } catch (err) {
    Sentry.captureException(err);
    return formError('An unexpected error occurred. Please try again.');
  }
}

/**
 * Server Action: Transition LR to a new status.
 *
 * Allowed roles: fleet_owner, hub_manager (with hub-scoped restrictions)
 */
export async function transitionLRStatus(
  lrId: string,
  toStatus: string,
  metadata?: { receiverName?: string; notes?: string; amountCollected?: number }
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient();

    // Import dynamically to keep this file lean
    const { transitionStatus } = await import('@/lib/services/lr');
    const result = await transitionStatus(supabase, {
      lrId,
      toStatus,
      metadata,
      userId: session.userId,
      tenantId: session.tenantId,
      userRole: session.userRole,
      userHubIds: session.hubIds,
    });

    if (!result.success) return result;

    revalidatePath(`/lorry-receipts/${lrId}`);
    revalidatePath('/lorry-receipts');
    return result;
  } catch (err) {
    Sentry.captureException(err);
    return formError('An unexpected error occurred. Please try again.');
  }
}
