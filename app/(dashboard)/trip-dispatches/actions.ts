'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole, getUserHubIds } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { createTripSchema, type CreateTripInput } from '@/lib/validations/trip';
import { insertTrip, getTripById, updateTrip } from '@/lib/db/trips';
import {
  getLRById,
  updateLRTrip,
  assignPoolLRsToTrip,
  releaseTripLRs,
  revertTripLRsToBooked,
} from '@/lib/db/lorry-receipts';
import { insertStatusHistoryBulk } from '@/lib/db/lr-status-history';
import { updateVehicleStatus, getAvailableVehiclesForOrigin, type AvailableVehicleOption } from '@/lib/db/vehicles';
import { getDriversByTenant, type DriverRow } from '@/lib/db/drivers';
import {
  type ActionResult,
  validationError,
  formError,
  actionSuccess,
  actionSuccessVoid,
} from '@/lib/types/action-result';
import type { LRStatus } from '@/lib/types/lr';

// ─────────────────────────────────────────────────────────────────────────────
// Create Trip
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an ad-hoc trip and auto-assigns all matching BOOKED pool LRs.
 * Bug 2 + Bug 6: trip creation now auto-slots BOOKED LRs with trip_id IS NULL
 * that match the route (from_hub_id + to_hub_id).
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Hub Managers can only start trips from their assigned hubs
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(parsed.data.from_hub_id)) {
        return {
          success: false,
          error: { from_hub_id: ['You can only start trips from your assigned branch hubs.'] },
        };
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

    // Auto-assign all BOOKED pool LRs matching this route to the new trip (Bug 6)
    await assignPoolLRsToTrip(
      supabase,
      newTrip.id,
      parsed.data.from_hub_id,
      parsed.data.to_hub_id,
      session.tenantId
    );

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccess({ id: newTrip.id });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to create trip.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Available LRs for a trip's route (pool)
// ─────────────────────────────────────────────────────────────────────────────

interface AvailableLRItem {
  id: string;
  lr_number: string | null;
  consignor_name: string;
  consignee_name: string;
  freight_amount: number;
}

/**
 * Returns BOOKED pool LRs (trip_id IS NULL) matching the trip's route.
 * Used by the manifest panel's "Available in Pool" section.
 */
export async function getAvailableLRsAction(
  tripId: string
): Promise<ActionResult<AvailableLRItem[]>> {
  try {
    await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const trip = await getTripById(supabase, tripId);
    if (!trip) return formError('Trip not found.');

    const { data, error } = await supabase
      .from('lorry_receipts')
      .select('id, lr_number, consignor_name, consignee_name, freight_amount')
      .eq('from_hub_id', trip.from_hub_id)
      .eq('to_hub_id', trip.to_hub_id)
      .eq('status', 'BOOKED')
      .is('trip_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return actionSuccess((data as AvailableLRItem[]) ?? []);
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to load available LRs.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign LR to trip manifest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assigns a single BOOKED pool LR to a SCHEDULED trip's manifest.
 * Used in the manifest panel "Add to trip" button.
 */
export async function assignLRToTripAction(
  lrId: string,
  tripId: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const [lr, trip] = await Promise.all([
      getLRById(supabase, lrId),
      getTripById(supabase, tripId),
    ]);

    if (!lr) return formError('Lorry Receipt not found.');
    if (!trip) return formError('Trip not found.');
    if (trip.status !== 'SCHEDULED') return formError('Can only assign LRs to a SCHEDULED trip.');
    if (lr.status !== 'BOOKED') return formError('Only BOOKED LRs can be assigned to a trip.');
    if (lr.trip_id !== null) return formError('This LR is already assigned to a trip.');

    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only manage manifests for trips departing from your assigned hubs.');
      }
    }

    await updateLRTrip(supabase, lrId, tripId);

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to assign LR to trip.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove LR from trip manifest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Removes a BOOKED LR from a SCHEDULED trip's manifest, returning it to the pool.
 * Used in the manifest panel "Remove" (−) button.
 */
export async function removeLRFromTripAction(
  lrId: string,
  tripId: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const [lr, trip] = await Promise.all([
      getLRById(supabase, lrId),
      getTripById(supabase, tripId),
    ]);

    if (!lr) return formError('Lorry Receipt not found.');
    if (!trip) return formError('Trip not found.');
    if (trip.status !== 'SCHEDULED') return formError('Cannot remove LRs from a trip that is already dispatched.');
    if (lr.status !== 'BOOKED') return formError('Only BOOKED LRs can be removed from a trip manifest.');

    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only manage manifests for trips departing from your assigned hubs.');
      }
    }

    await updateLRTrip(supabase, lrId, null);

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to remove LR from trip.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch Trip (SCHEDULED → IN_TRANSIT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatches the trip:
 *  - Bug 4: Vehicle must be assigned (hard block if missing)
 *  - Bug 3: All assigned BOOKED LRs → IN_TRANSIT atomically (PICKED_UP step removed)
 *  - Bug 7: Vehicle status → IN_TRANSIT automatically
 */
export async function dispatchTripAction(tripId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const trip = await getTripById(supabase, tripId);
    if (!trip) return formError('Trip not found.');

    if (trip.status !== 'SCHEDULED') {
      return formError(`Cannot dispatch trip. Current status is ${trip.status}.`);
    }

    // Hub manager must be at origin hub
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only dispatch trips departing from your assigned hubs.');
      }
    }

    // Bug 4: Vehicle is mandatory
    if (!trip.vehicle_id) {
      return formError('A vehicle must be assigned to this trip before it can be dispatched.');
    }

    // Bug 3: Dispatch all assigned BOOKED LRs
    const bookedLRs = trip.lorry_receipts.filter((lr) => lr.status === 'BOOKED');
    if (bookedLRs.length === 0) {
      return formError('No BOOKED Lorry Receipts are assigned to this trip. Add at least one LR to the manifest before dispatching.');
    }

    const bookedIds = bookedLRs.map((l) => l.id);

    // Atomically transition all BOOKED → IN_TRANSIT
    const { error: lrUpdateError } = await supabase
      .from('lorry_receipts')
      .update({ status: 'IN_TRANSIT', updated_at: new Date().toISOString() })
      .in('id', bookedIds);

    if (lrUpdateError) throw lrUpdateError;

    // Write immutable audit history for each LR
    await insertStatusHistoryBulk(supabase, bookedIds.map((id) => ({
      lr_id: id,
      from_status: 'BOOKED' as LRStatus,
      to_status: 'IN_TRANSIT' as LRStatus,
      changed_by: session.id,
      changed_at: new Date().toISOString(),
      notes: `Dispatched on trip ${tripId}`,
      tenant_id: session.tenantId,
    })));

    // Update trip status → IN_TRANSIT
    await updateTrip(supabase, tripId, {
      status: 'IN_TRANSIT',
      dispatched_at: new Date().toISOString(),
    });

    // Bug 7: Vehicle → IN_TRANSIT automatically
    await updateVehicleStatus(supabase, trip.vehicle_id, 'IN_TRANSIT');

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to dispatch trip.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark Trip Arrived (IN_TRANSIT → COMPLETED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks a trip as arrived at the destination:
 *  - Bug 5 + 8: closes the trip (COMPLETED)
 *  - All IN_TRANSIT LRs on the trip → ARRIVED atomically
 *  - Vehicle → AVAILABLE automatically
 *  - Restricted to destination Hub Manager or Fleet Owner
 */
export async function markTripArrivedAction(tripId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const trip = await getTripById(supabase, tripId);
    if (!trip) return formError('Trip not found.');

    if (trip.status !== 'IN_TRANSIT') {
      return formError(`Cannot mark as arrived. Current status is ${trip.status}.`);
    }

    // Hub Manager must be at the destination hub
    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.to_hub_id)) {
        return formError('You can only mark trips as arrived at your assigned destination hub.');
      }
    }

    const inTransitLRs = trip.lorry_receipts.filter((lr) => lr.status === 'IN_TRANSIT');

    if (inTransitLRs.length > 0) {
      const inTransitIds = inTransitLRs.map((l) => l.id);

      // Atomically move all IN_TRANSIT LRs → ARRIVED
      const { error: lrUpdateError } = await supabase
        .from('lorry_receipts')
        .update({ status: 'ARRIVED', updated_at: new Date().toISOString() })
        .in('id', inTransitIds);

      if (lrUpdateError) throw lrUpdateError;

      // Write audit history for each LR
      await insertStatusHistoryBulk(supabase, inTransitIds.map((id) => ({
        lr_id: id,
        from_status: 'IN_TRANSIT' as LRStatus,
        to_status: 'ARRIVED' as LRStatus,
        changed_by: session.id,
        changed_at: new Date().toISOString(),
        notes: 'Trip arrived at destination hub',
        tenant_id: session.tenantId,
      })));
    }

    // Mark trip COMPLETED with timestamp
    await updateTrip(supabase, tripId, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    });

    // Vehicle → AVAILABLE
    if (trip.vehicle_id) {
      await updateVehicleStatus(supabase, trip.vehicle_id, 'AVAILABLE');
    }

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to mark trip as arrived.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Trip
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancels a trip with correct lifecycle side effects:
 *
 * SCHEDULED (Fleet Owner or origin Hub Manager):
 *   → All assigned BOOKED LRs released to pool (trip_id = NULL, status stays BOOKED)
 *   → Trip → CANCELLED
 *
 * IN_TRANSIT (Fleet Owner only):
 *   → All IN_TRANSIT LRs reverted → BOOKED + trip_id = NULL
 *   → Vehicle → AVAILABLE
 *   → Trip → CANCELLED
 *
 * Bugs 9 + 10
 */
export async function cancelTripAction(tripId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const trip = await getTripById(supabase, tripId);
    if (!trip) return formError('Trip not found.');

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return formError(`Cannot cancel a trip that is already ${trip.status}.`);
    }

    if (session.role === 'hub_manager') {
      if (trip.status === 'IN_TRANSIT') {
        return formError('Only a Fleet Owner can cancel a trip that is already in transit.');
      }
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only cancel trips departing from your assigned hubs.');
      }
    }

    if (trip.status === 'SCHEDULED') {
      // Release all assigned BOOKED LRs back to pool
      await releaseTripLRs(supabase, tripId);
    } else if (trip.status === 'IN_TRANSIT') {
      // Revert all IN_TRANSIT LRs → BOOKED + release to pool
      const revertedIds = await revertTripLRsToBooked(supabase, tripId);

      if (revertedIds.length > 0) {
        await insertStatusHistoryBulk(supabase, revertedIds.map((id) => ({
          lr_id: id,
          from_status: 'IN_TRANSIT' as LRStatus,
          to_status: 'BOOKED' as LRStatus,
          changed_by: session.id,
          changed_at: new Date().toISOString(),
          notes: `Trip ${tripId} cancelled — LR returned to booking pool`,
          tenant_id: session.tenantId,
        })));
      }

      // Release the vehicle
      if (trip.vehicle_id) {
        await updateVehicleStatus(supabase, trip.vehicle_id, 'AVAILABLE');
      }
    }

    await updateTrip(supabase, tripId, { status: 'CANCELLED' });

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to cancel trip.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Available Fleet for a Trip's Origin Hub
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailableFleetData {
  vehicles: AvailableVehicleOption[];
  drivers: DriverRow[];
}

/**
 * Returns available vehicles (at origin hub) and active drivers.
 * Used by ManifestPanel and TripDialog.
 */
export async function getAvailableFleetAction(
  fromHubId: string,
  currentTripId?: string,
  currentVehicleId?: string
): Promise<ActionResult<AvailableFleetData>> {
  try {
    await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const [vehicles, driversResult] = await Promise.all([
      getAvailableVehiclesForOrigin(supabase, fromHubId, currentTripId, currentVehicleId),
      getDriversByTenant(supabase, { isActive: true, pageSize: 100 }),
    ]);

    return actionSuccess({
      vehicles,
      drivers: driversResult.data,
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to load fleet options.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign or Change Vehicle and Driver on a SCHEDULED Trip
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assigns or updates the vehicle and/or driver on a SCHEDULED trip.
 * Validates vehicle is available and at the trip's origin hub.
 */
export async function assignVehicleAndDriverAction(
  tripId: string,
  vehicleId: string | null,
  driverId: string | null
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const trip = await getTripById(supabase, tripId);
    if (!trip) return formError('Trip not found.');

    if (trip.status !== 'SCHEDULED') {
      return formError(`Cannot modify fleet assignment for a trip with status ${trip.status}.`);
    }

    if (session.role === 'hub_manager') {
      const assignedHubIds = await getUserHubIds(session.id);
      if (!assignedHubIds.includes(trip.from_hub_id)) {
        return formError('You can only manage fleet assignments for trips departing from your assigned hubs.');
      }
    }

    // If a vehicle is specified, validate it
    if (vehicleId) {
      const availableVehicles = await getAvailableVehiclesForOrigin(
        supabase,
        trip.from_hub_id,
        trip.id,
        trip.vehicle_id || undefined
      );

      const isMatch = availableVehicles.some((v) => v.id === vehicleId);
      if (!isMatch) {
        return formError(
          'Selected vehicle is either not available or not currently situated at this origin hub.'
        );
      }
    }

    // Update trip with new vehicle and driver
    await updateTrip(supabase, tripId, {
      vehicle_id: vehicleId,
      driver_id: driverId,
    });

    revalidatePath('/trip-dispatches');
    revalidatePath('/lorry-receipts');
    revalidatePath('/dashboard');

    return actionSuccessVoid();
  } catch (error: unknown) {
    Sentry.captureException(error);
    return formError(error instanceof Error ? error.message : 'Failed to assign vehicle and driver.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy alias kept for backwards compatibility
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use assignLRToTripAction */
export async function loadLRAction(lrId: string, tripId: string): Promise<ActionResult<void>> {
  return assignLRToTripAction(lrId, tripId);
}

