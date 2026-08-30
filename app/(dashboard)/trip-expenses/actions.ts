'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  ActionResult,
  actionSuccess,
  formError,
  validationError,
} from '@/lib/types/action-result';
import {
  tripExpenseCreateSchema,
  tripExpenseSettleSchema,
  tripExpenseVoidSchema,
} from '@/lib/validations/trip-expense';
import {
  addTripExpenseService,
  voidTripExpenseService,
  settleTripService,
  reopenSettlementService,
} from '@/lib/services/trip-expense';
import {
  getTripExpensesByTripId,
  getTripSettlementByTripId,
  type TripExpenseWithUsers,
  type TripSettlementWithUser,
} from '@/lib/db/trip-expenses';

export async function addTripExpenseAction(
  tripId: string,
  rawInput: unknown
): Promise<ActionResult<TripExpenseWithUsers>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = tripExpenseCreateSchema.safeParse(rawInput);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const amountPaise = Math.round(parseFloat(parsed.data.amount_rupees) * 100);
    const result = await addTripExpenseService(
      supabase,
      {
        tripId,
        category: parsed.data.category,
        amountPaise,
        description: parsed.data.description,
      },
      session
    );

    if (!result.success) {
      return result;
    }

    revalidatePath('/trip-expenses');
    revalidatePath('/trip-dispatches');
    revalidatePath('/dashboard');

    return actionSuccess(result.data as unknown as TripExpenseWithUsers);
  } catch (err: unknown) {
    Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return formError(msg);
  }
}

export async function voidTripExpenseAction(
  rawExpenseId: unknown
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = tripExpenseVoidSchema.safeParse({ expense_id: rawExpenseId });

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const result = await voidTripExpenseService(
      supabase,
      parsed.data.expense_id,
      session
    );

    if (!result.success) {
      return result;
    }

    revalidatePath('/trip-expenses');
    revalidatePath('/trip-dispatches');
    revalidatePath('/dashboard');

    return actionSuccess(undefined);
  } catch (err: unknown) {
    Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return formError(msg);
  }
}

export async function settleTripAction(
  tripId: string,
  rawInput: unknown
): Promise<ActionResult<TripSettlementWithUser>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = tripExpenseSettleSchema.safeParse(rawInput);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const supabase = createServerClient();
    const result = await settleTripService(
      supabase,
      {
        tripId,
        settlementMode: parsed.data.settlement_mode,
        notes: parsed.data.notes,
      },
      session
    );

    if (!result.success) {
      return result;
    }

    revalidatePath('/trip-expenses');
    revalidatePath('/trip-dispatches');
    revalidatePath('/dashboard');

    return actionSuccess(result.data as unknown as TripSettlementWithUser);
  } catch (err: unknown) {
    Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return formError(msg);
  }
}

export async function reopenSettlementAction(
  tripId: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole(['fleet_owner']);
    const supabase = createServerClient();

    const result = await reopenSettlementService(supabase, tripId, session);

    if (!result.success) {
      return result;
    }

    revalidatePath('/trip-expenses');
    revalidatePath('/trip-dispatches');
    revalidatePath('/dashboard');

    return actionSuccess(undefined);
  } catch (err: unknown) {
    Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return formError(msg);
  }
}

export async function getTripExpenseDetailsAction(
  tripId: string
): Promise<
  ActionResult<{
    expenses: TripExpenseWithUsers[];
    settlement: TripSettlementWithUser | null;
    totalAdvancesPaise: number;
    totalExpensesPaise: number;
    netBalancePaise: number;
  }>
> {
  try {
    await requireRole(['fleet_owner', 'hub_manager']);
    const supabase = createServerClient();

    const [expenses, settlement] = await Promise.all([
      getTripExpensesByTripId(supabase, tripId),
      getTripSettlementByTripId(supabase, tripId),
    ]);

    let totalAdvancesPaise = 0;
    let totalExpensesPaise = 0;
    let netBalancePaise = 0;

    for (const exp of expenses) {
      if (!exp.is_voided) {
        if (exp.category === 'ADVANCE') {
          totalAdvancesPaise += Number(exp.amount);
        } else {
          totalExpensesPaise += Math.abs(Number(exp.amount));
        }
        netBalancePaise += Number(exp.amount);
      }
    }

    return actionSuccess({
      expenses,
      settlement,
      totalAdvancesPaise,
      totalExpensesPaise,
      netBalancePaise,
    });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return formError(msg);
  }
}
