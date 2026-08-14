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
    PICKED_UP: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
    CANCELLED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'origin',
    },
  },
  PICKED_UP: {
    IN_TRANSIT: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'any',
    },
  },
  IN_TRANSIT: {
    ARRIVED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'destination',
    },
    CANCELLED: {
      allowedRoles: ['fleet_owner'],
      requiresHubScope: 'none',
    },
  },
  ARRIVED: {
    OUT_FOR_DELIVERY: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'destination',
    },
  },
  OUT_FOR_DELIVERY: {
    DELIVERED: {
      allowedRoles: ['fleet_owner', 'hub_manager'],
      requiresHubScope: 'destination',
    },
  },
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
