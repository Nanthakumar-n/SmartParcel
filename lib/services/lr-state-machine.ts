import type { LRStatus } from '@/lib/types/lr';
import type { UserRole } from '@/lib/auth/session';

interface TransitionRule {
  allowedRoles: UserRole[];
  requiresHubScope: 'origin' | 'destination' | 'any' | 'none';
}

export const VALID_TRANSITIONS: Record<
  LRStatus,
  Partial<Record<LRStatus, TransitionRule>>
> = {
  BOOKING_PENDING: {
    BOOKED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
    CANCELLED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
  },
  BOOKED: {
    // Primary path: trip dispatch moves BOOKED → IN_TRANSIT atomically for all assigned LRs.
    // This rule is also used for per-LR validation inside dispatchTripAction.
    IN_TRANSIT: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
    CANCELLED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
  },
  // PICKED_UP is deprecated — no longer used in the active flow.
  // Kept as an empty entry so existing DB rows with this status do not throw.
  PICKED_UP: {},
  IN_TRANSIT: {
    // Normal path: trip "Mark Arrived" moves all IN_TRANSIT LRs → ARRIVED atomically.
    // Fleet Owner can also use this as a per-LR override via the LR action menu.
    ARRIVED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'destination',
    },
    // Only Fleet Owner can cancel an in-transit LR (e.g. truck breakdown).
    CANCELLED: {
      allowedRoles: ['fleet_owner'],
      requiresHubScope: 'none',
    },
  },
  ARRIVED: {
    // Direct: ARRIVED → DELIVERED (OUT_FOR_DELIVERY step removed per lifecycle redesign).
    DELIVERED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'destination',
    },
  },
  // OUT_FOR_DELIVERY is deprecated — no longer used in the active flow.
  // Kept as an empty entry so existing DB rows with this status do not throw.
  OUT_FOR_DELIVERY: {},
  DELIVERED: {},
  CANCELLED: {},
};

export interface TransitionContext {
  role: UserRole;
  userHubIds: string[];
  lrFromHubId: string;
  lrToHubId: string;
}

export function validateTransition(
  currentStatus: LRStatus,
  nextStatus: LRStatus,
  ctx: TransitionContext
): { valid: true } | { valid: false; reason: string } {
  const transitions = VALID_TRANSITIONS[currentStatus];
  const rule = transitions?.[nextStatus];

  if (!rule) {
    return {
      valid: false,
      reason: `Transition from ${currentStatus} to ${nextStatus} is not allowed.`,
    };
  }

  if (!rule.allowedRoles.includes(ctx.role)) {
    return {
      valid: false,
      reason: `Your role (${ctx.role}) cannot perform this transition.`,
    };
  }

  // Fleet owners bypass hub scope checks
  if (ctx.role === 'fleet_owner') {
    return { valid: true };
  }

  if (rule.requiresHubScope === 'origin') {
    if (!ctx.userHubIds.includes(ctx.lrFromHubId)) {
      return {
        valid: false,
        reason: 'You can only perform this action at the origin hub.',
      };
    }
  }

  if (rule.requiresHubScope === 'destination') {
    if (!ctx.userHubIds.includes(ctx.lrToHubId)) {
      return {
        valid: false,
        reason: 'You can only perform this action at the destination hub.',
      };
    }
  }

  return { valid: true };
}

/**
 * Returns the list of valid next statuses for the current status and context.
 */
export function getAvailableTransitions(
  currentStatus: LRStatus,
  ctx: TransitionContext
): LRStatus[] {
  const transitions = VALID_TRANSITIONS[currentStatus];
  if (!transitions) return [];

  return (Object.keys(transitions) as LRStatus[]).filter((nextStatus) => {
    const result = validateTransition(currentStatus, nextStatus, ctx);
    return result.valid;
  });
}
