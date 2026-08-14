---
name: lr-state-machine
description: LR lifecycle state machine rules, valid transition enforcement, and audit trail write pattern for SmartParcel. Use when implementing LR status changes, dispatch workflows, delivery confirmation, or any feature that transitions an LR status.
---
# LR State Machine

The Lorry Receipt (LR) lifecycle is strictly controlled. Only defined transitions are allowed. Invalid transitions must always be rejected with a clear error.

---

## 1. Status Enum

```typescript
// types/lr.ts
export type LRStatus =
  | 'BOOKING_PENDING'
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
```

---

## 2. Valid Transition Map

```typescript
// lib/lr/state-machine.ts
import type { LRStatus } from '@/types/lr';
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
      allowedRoles: ['fleet_owner'], // Only fleet_owner can cancel in-transit
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
  // Terminal states — no transitions allowed
  DELIVERED: {},
  CANCELLED: {},
};
```

---

## 3. Transition Validation Function

Use this in every Server Action that changes LR status:

```typescript
// lib/lr/state-machine.ts (continued)

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
  const rule = VALID_TRANSITIONS[currentStatus]?.[nextStatus];

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
```

---

## 4. Server Action: Status Transition

Always use this pattern when changing LR status:

```typescript
// app/lorry-receipts/[id]/actions.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { validateTransition, type LRStatus } from '@/lib/lr/state-machine';
import { revalidatePath } from 'next/cache';

export async function transitionLRStatus(
  lrId: string,
  nextStatus: LRStatus,
  notes?: string
) {
  const supabase = createServerClient();
  const session = await requireRole(['fleet_owner', 'hub_manager']);

  // 1. Fetch the current LR
  const { data: lr, error: fetchError } = await supabase
    .from('lorry_receipts')
    .select('id, status, from_hub_id, to_hub_id')
    .eq('id', lrId)
    .single();

  if (fetchError || !lr) return { error: 'LR not found.' };

  // 2. Fetch user's assigned hubs
  const { data: hubAssignments } = await supabase
    .from('user_hub_assignments')
    .select('hub_id')
    .eq('user_id', session.id);

  const userHubIds = (hubAssignments ?? []).map((h) => h.hub_id);

  // 3. Validate the transition
  const result = validateTransition(lr.status as LRStatus, nextStatus, {
    role: session.role,
    userHubIds,
    lrFromHubId: lr.from_hub_id,
    lrToHubId: lr.to_hub_id,
  });

  if (!result.valid) return { error: result.reason };

  // 4. Update LR status
  const { error: updateError } = await supabase
    .from('lorry_receipts')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', lrId);

  if (updateError) return { error: 'Failed to update status.' };

  // 5. Write audit trail
  await supabase.from('lr_status_history').insert({
    lr_id: lrId,
    from_status: lr.status,
    to_status: nextStatus,
    changed_by: session.id,
    changed_at: new Date().toISOString(),
    notes: notes ?? null,
    tenant_id: session.tenantId,
  });

  revalidatePath(`/lorry-receipts/${lrId}`);
  return { success: true };
}
```

---

## 5. Trip Dispatch: Bulk Status Transition

When a trip is dispatched, all its LRs move from PICKED_UP → IN_TRANSIT atomically:

```typescript
// app/trips/[id]/actions.ts
'use server';

export async function dispatchTrip(tripId: string) {
  const supabase = createServerClient();
  const session = await requireRole(['fleet_owner', 'hub_manager']);

  // Fetch all LRs on this trip
  const { data: lrs } = await supabase
    .from('lorry_receipts')
    .select('id, status')
    .eq('trip_id', tripId);

  if (!lrs) return { error: 'No LRs found for this trip.' };

  // Validate every LR is in PICKED_UP state
  const invalid = lrs.filter((lr) => lr.status !== 'PICKED_UP');
  if (invalid.length > 0) {
    return {
      error: `${invalid.length} LR(s) are not in PICKED_UP state. Confirm goods are loaded before dispatching.`,
    };
  }

  // Bulk update all LRs to IN_TRANSIT
  const { error } = await supabase
    .from('lorry_receipts')
    .update({ status: 'IN_TRANSIT' })
    .eq('trip_id', tripId);

  if (error) return { error: 'Failed to dispatch trip.' };

  // Write audit trail for each LR
  const historyRows = lrs.map((lr) => ({
    lr_id: lr.id,
    from_status: 'PICKED_UP',
    to_status: 'IN_TRANSIT',
    changed_by: session.id,
    changed_at: new Date().toISOString(),
    notes: `Dispatched via trip ${tripId}`,
    tenant_id: session.tenantId,
  }));

  await supabase.from('lr_status_history').insert(historyRows);

  // Update trip status to IN_TRANSIT
  await supabase
    .from('trips')
    .update({ status: 'IN_TRANSIT', dispatched_at: new Date().toISOString() })
    .eq('id', tripId);

  revalidatePath('/trips');
  return { success: true };
}
```

---

## 6. DELIVERED: Capture POD + To-Pay Collection

When marking DELIVERED, additional data must be captured:

```typescript
// lib/validations/delivery.ts
import { z } from 'zod';

export const deliverySchema = z.object({
  receiver_name: z.string().min(2, 'Receiver name is required'),
  notes: z.string().optional(),
  // To-Pay collection (only required if payment_mode = TO_PAY)
  collected: z.boolean().optional(),
  amount_collected: z.coerce.number().positive().optional(),
  collection_payment_mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).optional(),
});
```

```typescript
export async function markDelivered(lrId: string, data: DeliveryInput) {
  // 1. Transition status (using transitionLRStatus above)
  const transition = await transitionLRStatus(lrId, 'DELIVERED');
  if ('error' in transition) return transition;

  // 2. Create POD record
  await supabase.from('proof_of_deliveries').insert({
    lr_id: lrId,
    receiver_name: data.receiver_name,
    delivered_at: new Date().toISOString(),
    notes: data.notes ?? null,
    photo_url: null, // v2 — Flutter app
    tenant_id: session.tenantId,
  });

  // 3. Create To-Pay collection record if applicable
  if (lr.payment_mode === 'TO_PAY' && data.collected !== undefined) {
    await supabase.from('to_pay_collections').insert({
      lr_id: lrId,
      collected: data.collected,
      amount_collected: data.amount_collected ?? lr.freight_amount,
      collected_by: session.id,
      collected_at: new Date().toISOString(),
      payment_mode: data.collection_payment_mode ?? 'CASH',
      tenant_id: session.tenantId,
    });
  }

  return { success: true };
}
```

---

## 7. State Machine Diagram

```
BOOKING_PENDING
    │ Hub Manager accepts
    ▼
  BOOKED ──────────────────────────────────── CANCELLED
    │ Hub Manager loads goods                  (Hub Mgr: pre-transit)
    ▼                                          (Fleet Owner: any time)
 PICKED_UP
    │ Fleet Owner / Hub Manager dispatches trip
    ▼
 IN_TRANSIT ──────────────────────────────── CANCELLED
    │ Destination Hub Manager confirms arrival  (Fleet Owner only)
    ▼
  ARRIVED
    │ Destination Hub Manager readies for pickup
    ▼
OUT_FOR_DELIVERY
    │ Destination Hub Manager confirms delivery
    ▼
 DELIVERED ← terminal (no further transitions)
```

---

## 8. Verification Checklist

- [ ] `validateTransition()` is called before every status update.
- [ ] Audit trail row is inserted immediately after every successful transition.
- [ ] `DELIVERED` and `CANCELLED` are treated as terminal — no transitions out.
- [ ] Trip dispatch bulk-transitions all LRs atomically.
- [ ] `markDelivered` creates both POD and To-Pay records when applicable.
- [ ] Hub scope is enforced for origin and destination actions.
