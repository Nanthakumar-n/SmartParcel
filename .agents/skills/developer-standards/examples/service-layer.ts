// ===========================================================
// lib/services/lr.ts
// Reference SERVICE LAYER for Lorry Receipt operations
// ===========================================================
//
// This is Layer 2 in the 3-layer architecture.
//
// Rules:
// - Contains business logic, validation, orchestration.
// - Receives a typed Supabase client — never creates its own.
// - Calls lib/db/ helpers for all database operations.
// - Returns ActionResult<T> — never throws.
// - Does NOT import from `next/cache` or `next/headers`.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ActionResult } from '@/lib/types/action-result';
import type { LRCreateInput } from '@/lib/validations/lr';
import { actionSuccess, actionError, formError } from '@/lib/types/action-result';
import { validateTransition } from '@/lib/services/lr-state-machine';
import { insertLR, getLRById, updateLRStatus } from '@/lib/db/lr';
import { insertStatusHistory } from '@/lib/db/lr-status-history';
import { insertProofOfDelivery } from '@/lib/db/proof-of-delivery';
import { insertToPayCollection } from '@/lib/db/to-pay-collections';

// --------------- Types ---------------

interface CreateLRContext {
  input: LRCreateInput;
  userId: string;
  tenantId: string;
  userRole: string;
  userHubIds: string[];
}

interface TransitionContext {
  lrId: string;
  toStatus: string;
  metadata?: {
    receiverName?: string;
    notes?: string;
    amountCollected?: number;
  };
  userId: string;
  tenantId: string;
  userRole: string;
  userHubIds: string[];
}

// --------------- Service Functions ---------------

/**
 * Create a new Lorry Receipt.
 *
 * Business rules enforced here:
 * - Hub managers can only create LRs for their assigned hubs.
 * - Freight amount is converted from rupees to paise.
 * - Initial status is always BOOKING_PENDING.
 */
export async function createLR(
  supabase: SupabaseClient<Database>,
  ctx: CreateLRContext
): Promise<ActionResult<{ id: string; lrNumber: string }>> {
  // Guard: Hub manager can only create for their assigned hubs
  if (ctx.userRole === 'hub_manager') {
    if (!ctx.userHubIds.includes(ctx.input.from_hub_id)) {
      return actionError('from_hub_id', 'You can only create LRs for your assigned hubs');
    }
  }

  // Convert freight from rupees (user input) to paise (storage)
  const freightPaise = Math.round(ctx.input.freight_amount * 100);

  // Delegate DB write to the DB helper
  const { data, error } = await insertLR(supabase, {
    ...ctx.input,
    freight_amount: freightPaise,
    status: 'BOOKING_PENDING',
    tenant_id: ctx.tenantId,
    created_by: ctx.userId,
  });

  if (error) return formError(error.message);

  // Write initial audit trail entry
  await insertStatusHistory(supabase, {
    lr_id: data.id,
    from_status: null,
    to_status: 'BOOKING_PENDING',
    changed_by: ctx.userId,
    tenant_id: ctx.tenantId,
  });

  return actionSuccess({ id: data.id, lrNumber: data.lr_number });
}

/**
 * Transition an LR to a new status.
 *
 * Business rules enforced here:
 * - State machine validation (valid transition for current status + actor).
 * - DELIVERED triggers POD creation + optional To-Pay collection.
 * - Hub managers can only transition LRs at their assigned hubs.
 */
export async function transitionStatus(
  supabase: SupabaseClient<Database>,
  ctx: TransitionContext
): Promise<ActionResult<void>> {
  // Fetch current LR state
  const { data: lr, error: fetchError } = await getLRById(supabase, ctx.lrId);
  if (fetchError || !lr) return formError('Lorry Receipt not found');

  // Validate the transition using the state machine
  const validation = validateTransition(lr.status, ctx.toStatus, {
    userRole: ctx.userRole,
    userHubIds: ctx.userHubIds,
    lrFromHubId: lr.from_hub_id,
    lrToHubId: lr.to_hub_id,
  });

  if (!validation.valid) {
    return formError(validation.reason);
  }

  // Perform the status update
  const { error: updateError } = await updateLRStatus(
    supabase,
    ctx.lrId,
    ctx.toStatus
  );
  if (updateError) return formError(updateError.message);

  // Write audit trail (always, immediately after status change)
  await insertStatusHistory(supabase, {
    lr_id: ctx.lrId,
    from_status: lr.status,
    to_status: ctx.toStatus,
    changed_by: ctx.userId,
    tenant_id: ctx.tenantId,
    notes: ctx.metadata?.notes,
  });

  // DELIVERED: Create POD + optional To-Pay collection
  if (ctx.toStatus === 'DELIVERED') {
    await handleDeliveryRecords(supabase, lr, ctx);
  }

  return actionSuccess(undefined);
}

// --------------- Private Helpers ---------------

/**
 * Create POD and To-Pay records when marking DELIVERED.
 * Extracted to keep transitionStatus under 50 lines.
 */
async function handleDeliveryRecords(
  supabase: SupabaseClient<Database>,
  lr: { id: string; payment_mode: string; freight_amount: number; tenant_id: string },
  ctx: TransitionContext
): Promise<void> {
  // Always create proof of delivery
  await insertProofOfDelivery(supabase, {
    lr_id: lr.id,
    receiver_name: ctx.metadata?.receiverName ?? 'Unknown',
    tenant_id: lr.tenant_id,
  });

  // Create To-Pay collection if payment mode is TO_PAY
  if (lr.payment_mode === 'TO_PAY') {
    await insertToPayCollection(supabase, {
      lr_id: lr.id,
      amount_collected: ctx.metadata?.amountCollected ?? lr.freight_amount,
      collected_by: ctx.userId,
      payment_mode: 'CASH', // default, can be overridden
      tenant_id: lr.tenant_id,
    });
  }
}
