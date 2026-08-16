import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { LRStatus } from '@/lib/types/lr';
import { getUserHubIds, type UserSession } from '@/lib/auth/session';
import { validateTransition } from '@/lib/services/lr-state-machine';
import { updateLRStatus, getLRById } from '@/lib/db/lorry-receipts';
import { insertPOD, insertToPayCollection, getPODByLRId, getToPayCollectionByLRId } from '@/lib/db/collections-pod';
import type { DeliveryConfirmationInput, LRTransitionInput } from '@/lib/validations/delivery';
import {
  type ActionResult,
  actionSuccess,
  formError,
} from '@/lib/types/action-result';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Service to confirm delivery, capture Proof of Delivery (POD),
 * and record To-Pay freight collections atomically.
 */
export async function confirmDeliveryService(
  supabase: AnySupabaseClient,
  input: DeliveryConfirmationInput,
  session: UserSession
): Promise<ActionResult<{ lrId: string; lrNumber: string }>> {
  try {
    // 1. Fetch current LR
    const lr = await getLRById(supabase, input.lr_id);
    if (!lr) {
      return formError('Lorry Receipt not found');
    }

    if (lr.status === 'DELIVERED') {
      return formError('This Lorry Receipt is already marked as DELIVERED');
    }

    if (lr.status === 'CANCELLED') {
      return formError('Cannot deliver a cancelled Lorry Receipt');
    }

    // 2. Validate transition per LR State Machine
    const assignedHubIds =
      session.role === 'hub_manager' ? await getUserHubIds(session.id) : [];

    const transitionResult = validateTransition(
      lr.status as LRStatus,
      'DELIVERED',
      {
        role: session.role,
        userHubIds: assignedHubIds,
        lrFromHubId: lr.from_hub_id,
        lrToHubId: lr.to_hub_id,
      }
    );

    if (!transitionResult.valid) {
      return formError(transitionResult.reason);
    }

    // 3. Update LR status to DELIVERED
    await updateLRStatus(supabase, lr.id, 'DELIVERED');

    // 4. Create Proof of Delivery (POD) record
    await insertPOD(supabase, {
      lr_id: lr.id,
      receiver_name: input.receiver_name.trim(),
      delivered_at: input.delivered_at || new Date().toISOString(),
      notes: input.notes ? input.notes.trim() : null,
      tenant_id: session.tenantId,
    });

    // 5. If payment mode is TO_PAY, record To-Pay collection
    if (lr.payment_mode === 'TO_PAY') {
      const amountPaise = input.amount_collected_rupees
        ? Math.round(parseFloat(input.amount_collected_rupees) * 100)
        : Number(lr.freight_amount);

      await insertToPayCollection(supabase, {
        lr_id: lr.id,
        collected: true,
        amount_collected: amountPaise,
        collected_by: input.collected_by ? input.collected_by.trim() : session.email,
        collected_at: new Date().toISOString(),
        payment_mode: input.collection_payment_mode || 'CASH',
        notes: input.collection_notes ? input.collection_notes.trim() : null,
        tenant_id: session.tenantId,
      });
    }

    // 6. Write immutable audit history
    await supabase.from('lr_status_history').insert({
      lr_id: lr.id,
      from_status: lr.status,
      to_status: 'DELIVERED',
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: `Delivered to ${input.receiver_name.trim()}${
        lr.payment_mode === 'TO_PAY' ? ' (To-Pay freight collected)' : ''
      }`,
      tenant_id: session.tenantId,
    });

    return actionSuccess({
      lrId: lr.id,
      lrNumber: lr.lr_number ?? '',
    });
  } catch (error: unknown) {
    return formError(
      error instanceof Error ? error.message : 'Failed to confirm delivery'
    );
  }
}

/**
 * Service to transition LR status (e.g. ARRIVED, OUT_FOR_DELIVERY, CANCELLED).
 */
export async function transitionLRStatusService(
  supabase: AnySupabaseClient,
  input: LRTransitionInput,
  session: UserSession
): Promise<ActionResult<{ lrId: string; nextStatus: LRStatus }>> {
  try {
    // 1. Fetch current LR
    const lr = await getLRById(supabase, input.lr_id);
    if (!lr) {
      return formError('Lorry Receipt not found');
    }

    const nextStatus = input.next_status as LRStatus;

    // 2. Validate transition per LR State Machine
    const assignedHubIds =
      session.role === 'hub_manager' ? await getUserHubIds(session.id) : [];

    const transitionResult = validateTransition(
      lr.status as LRStatus,
      nextStatus,
      {
        role: session.role,
        userHubIds: assignedHubIds,
        lrFromHubId: lr.from_hub_id,
        lrToHubId: lr.to_hub_id,
      }
    );

    if (!transitionResult.valid) {
      return formError(transitionResult.reason);
    }

    // 3. Update LR status
    await updateLRStatus(supabase, lr.id, nextStatus);

    // 4. Write immutable audit history
    await supabase.from('lr_status_history').insert({
      lr_id: lr.id,
      from_status: lr.status,
      to_status: nextStatus,
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: input.notes ? input.notes.trim() : `Status updated to ${nextStatus}`,
      tenant_id: session.tenantId,
    });

    return actionSuccess({
      lrId: lr.id,
      nextStatus,
    });
  } catch (error: unknown) {
    return formError(
      error instanceof Error ? error.message : 'Failed to update LR status'
    );
  }
}

/**
 * Fetch POD and collection details for a delivered LR.
 */
export async function getLRDeliverySummary(
  supabase: AnySupabaseClient,
  lrId: string
) {
  const [pod, collection] = await Promise.all([
    getPODByLRId(supabase, lrId),
    getToPayCollectionByLRId(supabase, lrId),
  ]);

  return { pod, collection };
}
