'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole, getUserHubIds } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { createTripSchema, type CreateTripInput } from '@/lib/validations/trip';
import { insertTrip, getTripById, updateTrip } from '@/lib/db/trips';
import { getLRById, updateLRStatus, updateLRTrip } from '@/lib/db/lorry-receipts';
import { insertStatusHistory, insertStatusHistoryBulk } from '@/lib/db/lr-status-history';
import {
  type ActionResult,
  validationError,
  formError,
  actionSuccess,
  actionSuccessVoid,
  actionError,
} from '@/lib/types/action-result';
import type { LRStatus } from '@/lib/types/lr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/supabase';

/**
 * Server Action to create an ad-hoc Trip.
 */
export async function createTripAction(
  data: CreateTripInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = createTripSchema.safeParse(data);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient() as unknown as SupabaseClient<Database>;

    // Enforce hub scope for Hub Managers
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(parsed.data.from_hub_id)) {
        return actionError(
          'from_hub_id',
          'You can only start trips from your assigned branch hubs.'
        );
      }
    }

    const newTrip = await insertTrip(supabase, {
      from_hub_id: parsed.data.from_hub_id,
      to_hub_id: parsed.data.to_hub_id,
      vehicle_id: parsed.data.vehicle_id || null,
      driver_id: parsed.data.driver_id || null,
      scheduled_departure: parsed.data.scheduled_departure,
      status: 'SCHEDULED',
      notes: parsed.data.notes || null,
      tenant_id: session.tenantId,
      created_by: session.id,
    });

    revalidatePath('/trip-dispatches');
    revalidatePath('/dashboard');

    return actionSuccess({ id: newTrip.id });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to create trip.'
    );
  }
}

/**
 * Transitions a Lorry Receipt from BOOKED -> PICKED_UP to confirm loading.
 */
export async function loadLRAction(
  lrId: string,
  tripId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient() as unknown as SupabaseClient<Database>;

    // 1. Fetch LR to verify current state & origin hub
    const lr = await getLRById(supabase, lrId);

    if (!lr) {
      return formError('Lorry Receipt not found.');
    }

    // 2. Validate user belongs to the origin hub (if hub_manager)
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(lr.from_hub_id)) {
        return formError('You can only load cargo at your assigned branch hub.');
      }
    }

    // 3. Confirm transition is BOOKED -> PICKED_UP
    if (lr.status !== 'BOOKED') {
      return formError(`Cannot load cargo. LR status is currently ${lr.status}.`);
    }

    // 4. Update LR status & trip assignment
    await updateLRTrip(supabase, lrId, tripId);
    await updateLRStatus(supabase, lrId, 'PICKED_UP');

    // 5. Write history audit trail
    await insertStatusHistory(supabase, {
      lr_id: lrId,
      from_status: 'BOOKED',
      to_status: 'PICKED_UP',
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: `Loaded onto trip ${tripId}`,
      tenant_id: session.tenantId,
    });

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to load cargo.'
    );
  }
}

/**
 * Bulk loads all BOOKED LRs assigned to a trip.
 */
export async function loadAllLRsAction(
  tripId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient() as unknown as SupabaseClient<Database>;

    // 1. Fetch trip and its LRs
    const trip = await getTripById(supabase, tripId);
    if (!trip) {
      return formError('Trip not found.');
    }

    // Hub manager permission check
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only load cargo for trips starting from your assigned hubs.');
      }
    }

    const bookedLRs = trip.lorry_receipts.filter((lr) => lr.status === 'BOOKED');
    if (bookedLRs.length === 0) {
      return actionSuccessVoid();
    }

    // 2. Perform updates
    const lrIds = bookedLRs.map((l) => l.id);
    
    // Bulk update LR statuses to PICKED_UP
    const { error: updateError } = await supabase
      .from('lorry_receipts')
      .update({ status: 'PICKED_UP', updated_at: new Date().toISOString() })
      .in('id', lrIds);

    if (updateError) {
      return formError('Failed to bulk load LRs.');
    }

    // 3. Log status history rows
    const historyRows = lrIds.map((id) => ({
      lr_id: id,
      from_status: 'BOOKED' as LRStatus,
      to_status: 'PICKED_UP' as LRStatus,
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: `Bulk loaded onto trip ${tripId}`,
      tenant_id: session.tenantId,
    }));

    await insertStatusHistoryBulk(supabase, historyRows);

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to bulk load cargo.'
    );
  }
}

/**
 * Dispatches the trip, updating both trip status and all its PICKED_UP LRs to IN_TRANSIT.
 */
export async function dispatchTripAction(
  tripId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient() as unknown as SupabaseClient<Database>;

    // 1. Fetch the trip and its LRs
    const trip = await getTripById(supabase, tripId);
    if (!trip) {
      return formError('Trip not found.');
    }

    // Hub manager permission check
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only dispatch trips departing from your assigned hubs.');
      }
    }

    if (trip.status !== 'SCHEDULED') {
      return formError(`Cannot dispatch trip. Status is currently ${trip.status}.`);
    }

    // 2. Fetch assigned LRs and check statuses
    const lrs = trip.lorry_receipts;
    if (lrs.length === 0) {
      return formError('Cannot dispatch an empty trip. Assign and load lorry receipts first.');
    }

    // Check if there are any BOOKED LRs that haven't been marked as PICKED_UP yet
    const bookedCount = lrs.filter((lr) => lr.status === 'BOOKED').length;
    if (bookedCount > 0) {
      return formError(
        `There are ${bookedCount} un-loaded Lorry Receipt(s) on this run. Load them first.`
      );
    }

    const pickedUpLRs = lrs.filter((lr) => lr.status === 'PICKED_UP');
    if (pickedUpLRs.length === 0) {
      return formError('Confirm that cargo is loaded (PICKED_UP) before dispatching.');
    }

    // 3. Atomically transition LRs to IN_TRANSIT
    const pickedUpIds = pickedUpLRs.map((l) => l.id);
    const { error: lrUpdateError } = await supabase
      .from('lorry_receipts')
      .update({ status: 'IN_TRANSIT', updated_at: new Date().toISOString() })
      .in('id', pickedUpIds);

    if (lrUpdateError) {
      return formError('Failed to transition LRs to IN_TRANSIT.');
    }

    // 4. Create history rows for LRs
    const historyRows = pickedUpIds.map((id) => ({
      lr_id: id,
      from_status: 'PICKED_UP' as LRStatus,
      to_status: 'IN_TRANSIT' as LRStatus,
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: `Dispatched on trip ${tripId}`,
      tenant_id: session.tenantId,
    }));

    await insertStatusHistoryBulk(supabase, historyRows);

    // 5. Update Trip status to IN_TRANSIT
    await updateTrip(supabase, tripId, {
      status: 'IN_TRANSIT',
      dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(
      error instanceof Error ? error.message : 'Failed to dispatch trip.'
    );
  }
}
