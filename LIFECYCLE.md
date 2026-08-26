# SmartParcel — Lifecycle & Flow Design

> **This is the single source of truth for the LR state machine, trip lifecycle, vehicle lifecycle, and all associated RBAC rules.**
> Last updated: 2026-08-23 (grill-me session with product owner).
> Any conflict between this file and CONTEXT.md should be resolved in favour of this file.

---

## 1. LR Status State Machine

### Active Statuses (Phase 1)

```
Customer submits online booking
        │
        ▼
  BOOKING_PENDING  ──── Hub Manager rejects ────► CANCELLED
        │
        │ Hub Manager accepts → creates LR + prints thermal receipt
        ▼
      BOOKED  ──────────────────────────────────► CANCELLED
        │    (Hub Manager = own hub, BOOKED only)
        │    (Fleet Owner = any stage up to IN_TRANSIT)
        │ Trip dispatched (all assigned BOOKED LRs → IN_TRANSIT atomically)
        ▼
    IN_TRANSIT  ──────────────────────────────────► CANCELLED (Fleet Owner only)
        │                                            LRs revert to BOOKED + trip_id = NULL
        │                                            Vehicle → AVAILABLE
        │ Trip marked ARRIVED (Hub Manager at destination or Fleet Owner)
        ▼
     ARRIVED  (all LRs on trip arrive simultaneously)
        │
        │ Hub Manager (destination) or Fleet Owner marks individual LR delivered
        ▼
    DELIVERED  (terminal — immutable)
```

### ⚠️ Deprecated Statuses (Do NOT use in new code)
- ~~`PICKED_UP`~~ — removed. Goods at hub = BOOKED. Loading onto truck = implicit in Dispatch.
- ~~`OUT_FOR_DELIVERY`~~ — removed. ARRIVED → DELIVERED directly.

These statuses may still exist in the DB enum for migration safety but must NOT be created or transitioned to by any application code.

---

## 2. LR Transition Ownership

| Transition | Who Can Trigger | Hub Scope |
|---|---|---|
| → `BOOKING_PENDING` | System (auto on customer web form) | — |
| → `BOOKED` | Hub Manager (accept booking) OR Hub Manager/Fleet Owner (direct LR creation) | Origin hub |
| → `IN_TRANSIT` | Fleet Owner or Hub Manager — via Trip Dispatch | Origin hub |
| → `ARRIVED` | Fleet Owner or Hub Manager — via Trip "Mark Arrived" | Destination hub only |
| → `DELIVERED` | Fleet Owner or Hub Manager | Destination hub only |
| → `CANCELLED` (BOOKING_PENDING / BOOKED) | Fleet Owner or Hub Manager | Own hub only |
| → `CANCELLED` (IN_TRANSIT) | Fleet Owner only | None (any hub) |

---

## 3. Trip Lifecycle

### Trip Statuses
```
SCHEDULED → IN_TRANSIT → COMPLETED
          ↘ CANCELLED
```

### Trip Event Side Effects

| Trip Event | Who Triggers | LR Side Effect | Vehicle Side Effect |
|---|---|---|---|
| **Trip Created** (→ SCHEDULED) | Fleet Owner or Hub Manager (origin hub) | All BOOKED LRs with `trip_id IS NULL` matching route auto-assigned (`trip_id` = new trip). Hub Manager can manually add/remove LRs before dispatch. | No change |
| **Trip Dispatched** (→ IN_TRANSIT) | Fleet Owner or Hub Manager (origin hub) | All BOOKED LRs assigned to this trip → `IN_TRANSIT` atomically. LRs in pool (unassigned, `trip_id IS NULL`) are unaffected. | `IN_TRANSIT` |
| **Trip Arrived** (→ COMPLETED) | Fleet Owner or Hub Manager (**destination hub only**) | All `IN_TRANSIT` LRs on this trip → `ARRIVED` atomically. LRs then continue independently to `DELIVERED`. | `AVAILABLE` |
| **Trip Cancelled** (from SCHEDULED) | Fleet Owner or Hub Manager (origin hub) | All assigned BOOKED LRs: `trip_id = NULL` (released to pool). Status stays `BOOKED`. | No change |
| **Trip Cancelled** (from IN_TRANSIT) | Fleet Owner only | All `IN_TRANSIT` LRs on this trip → `BOOKED` + `trip_id = NULL` (reverted to pool). | `AVAILABLE` |

### Dispatch Pre-flight Requirements
- **Vehicle must be assigned** — hard block if `vehicle_id IS NULL`. Clear error shown.
- **Driver is optional** — contractor trucks without a registered driver are allowed.

---

## 4. Vehicle Lifecycle

| Event | Vehicle Status Change | Trigger |
|---|---|---|
| Trip Dispatched | `AVAILABLE` → `IN_TRANSIT` | Automatic on trip dispatch |
| Trip COMPLETED (Arrived) | `IN_TRANSIT` → `AVAILABLE` | Automatic on trip arrival |
| Trip Cancelled (IN_TRANSIT) | `IN_TRANSIT` → `AVAILABLE` | Automatic on trip cancellation |
| Fleet Owner manual toggle | Any ↔ `UNDER_MAINTENANCE` or `AVAILABLE` | Manual on Vehicles page |

> Vehicle status is **automatically managed** by trip lifecycle events. No manual toggle is needed for normal dispatch/arrival flows.

---

## 5. LR Pool & Trip Assignment Rules

1. LRs sit in `BOOKED` status with `trip_id = NULL` until assigned.
2. When a **trip is created** on route A→B, the system **auto-assigns** all BOOKED LRs where `trip_id IS NULL` AND `from_hub_id = A` AND `to_hub_id = B`.
3. Before dispatch, Hub Manager can **manually remove** LRs from the trip (releases them back to pool: `trip_id = NULL`).
4. Before dispatch, Hub Manager can **manually add** BOOKED pool LRs to the trip (sets `trip_id`).
5. On **Dispatch**: only LRs where `trip_id = this trip` AND `status = BOOKED` are moved to `IN_TRANSIT`.
6. **No partial-load concept**: dispatch is all-or-nothing for the assigned manifest.

---

## 6. RBAC — Lifecycle Actions

| Action | Fleet Owner | Hub Manager |
|---|---|---|
| Register tenant / company profile | ✅ | ❌ |
| Invite & manage users | ✅ | ❌ |
| Manage hubs | ✅ | ❌ |
| Manage vehicles | ✅ | ❌ |
| Manage driver records | ✅ | ❌ |
| Define trip schedules | ✅ | ❌ |
| Create ad-hoc trip | ✅ | ✅ (origin = own hub) |
| Assign / remove LRs from trip manifest | ✅ | ✅ (origin hub only) |
| Create LR (direct) | ✅ | ✅ (own hub only) |
| Accept/reject customer booking requests | ✅ | ✅ (own hub only) |
| View all LRs | ✅ | ✅ (read-only for other hubs) |
| Edit LR | ✅ | ✅ (own hub, BOOKING_PENDING/BOOKED only) |
| Cancel LR (BOOKING_PENDING / BOOKED) | ✅ | ✅ (own hub only) |
| Cancel LR (IN_TRANSIT or later) | ✅ | ❌ |
| **Dispatch trip** (SCHEDULED → IN_TRANSIT) | ✅ | ✅ (origin hub only) |
| **Mark trip Arrived** (IN_TRANSIT → COMPLETED) | ✅ | ✅ (destination hub only) |
| **Cancel trip** (SCHEDULED) | ✅ | ✅ (origin hub only) |
| **Cancel trip** (IN_TRANSIT) | ✅ | ❌ |
| Mark LR DELIVERED + capture POD | ✅ | ✅ (destination hub only) |
| Record To-Pay collection | ✅ | ✅ |
| Print LR thermal / PDF | ✅ | ✅ |
| View Fleet Owner dashboard | ✅ | ❌ |
| View Hub Manager dashboard | ✅ | ✅ |
| Access web admin | ✅ | ✅ |

---

## 7. Booking Request Flow (Customer-Originated)

1. Customer visits `smartparcel.in/book/[tenant-slug]` — no login.
2. Fills name, phone, origin city, destination city, goods description, weight.
3. System creates row in `booking_requests` table with status `PENDING`. LR is **not yet created**.
4. Hub Manager sees **Pending Requests** badge on dashboard.
5. Hub Manager reviews:
   - **Accept** → opens LR creation form pre-filled with customer data. Hub Manager completes and submits → LR created in `BOOKED`.
   - **Reject** → booking request marked `REJECTED`. LR is never created.
6. **There is no auto-LR-creation on Accept** — Hub Manager always fills/confirms the LR form.

---

## 8. Key Invariants (Never Violate)

- `DELIVERED` is a terminal state. Once set, an LR status can never be changed.
- `CANCELLED` is a terminal state for individual LRs.
- Every LR status transition must write an entry to `lr_status_history` (immutable audit trail).
- Every LR has a `tenant_id`. RLS enforces isolation.
- Trip dispatch and trip arrival are **atomic**: all qualifying LRs transition in a single DB operation.
- A trip MUST have a vehicle assigned before it can be dispatched.
