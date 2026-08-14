---
name: qa-verification
description: Automated QA protocol for testing multi-tenant isolation, form validation, UI responsiveness, RBAC, and LR state machine correctness. Use when verifying completed tasks or testing features.
---
# QA Verification Protocol

Run this full checklist before marking any task complete.

---

## 1. Seed Test Data

Always test with two isolated tenants to verify isolation:

```sql
-- Tenant A: "Sharma Logistics"
INSERT INTO tenants (id, name, slug) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Sharma Logistics', 'sharma');

-- Tenant B: "Gupta Transport"
INSERT INTO tenants (id, name, slug) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Gupta Transport', 'gupta');

-- Users (passwords set via Supabase Auth dashboard)
-- Fleet Owner A: fleet_owner role, tenant A
-- Hub Manager A: hub_manager role, tenant A, assigned to MUM hub
-- Fleet Owner B: fleet_owner role, tenant B

-- Test hubs
INSERT INTO hubs (id, tenant_id, hub_code, name, city, state, pin_code) VALUES
  ('hub-mum-001', 'aaaaaaaa-...', 'MUM', 'Mumbai Central', 'Mumbai', 'Maharashtra', '400001'),
  ('hub-del-001', 'aaaaaaaa-...', 'DEL', 'Delhi Hub', 'Delhi', 'Delhi', '110001');
```

---

## 2. Multi-Tenant Isolation Tests

**Goal**: Tenant B must never see Tenant A's data.

### Test Steps
1. Log in as **Fleet Owner A** → create 2 LRs. Note their LR numbers.
2. Log in as **Fleet Owner B** → navigate to LR listing.
3. **Assert**: Fleet Owner B sees zero LRs (not Tenant A's LRs).
4. Attempt direct Supabase query as Tenant B for Tenant A's LR ID:
   ```typescript
   const { data } = await supabase
     .from('lorry_receipts')
     .select('*')
     .eq('id', tenantA_lr_id);
   // Expected: data = [] (empty, not an error)
   ```
5. **Assert**: Response is empty — RLS silently filters, not 403.

### Cross-Hub Isolation
1. Log in as **Hub Manager (MUM hub)**.
2. Navigate to LR listing.
3. **Assert**: Can see all LRs (own hub + other hubs read-only).
4. Attempt to create an LR with `from_hub_id = DEL hub`:
5. **Assert**: Insert is rejected by RLS (`hub_manager_insert_lr` policy).

---

## 3. RBAC Route Protection Tests

**Goal**: Roles cannot access pages/actions outside their permission.

| Test | User | Action | Expected |
|---|---|---|---|
| Hub Manager cannot access user management | hub_manager | GET `/settings/users` | Redirect to dashboard |
| Hub Manager cannot manage hubs | hub_manager | POST `/hubs` (create hub) | 403 or redirect |
| Hub Manager cannot cancel IN_TRANSIT LR | hub_manager | PATCH LR status → CANCELLED | Server Action returns error |
| Fleet Owner can cancel IN_TRANSIT LR | fleet_owner | PATCH LR status → CANCELLED | Success |
| Driver cannot access web admin | driver | GET `/dashboard` | Redirect to login or error page |
| Unauthenticated user cannot access dashboard | anon | GET `/dashboard` | Redirect to `/login` |
| Unauthenticated user CAN access booking form | anon | GET `/book/sharma` | Page loads successfully |

---

## 4. LR State Machine Transition Tests

**Goal**: Invalid status transitions must be rejected.

### Valid Transition Matrix
| From | To | Who | Should Succeed |
|---|---|---|---|
| BOOKING_PENDING | BOOKED | hub_manager | ✅ |
| BOOKING_PENDING | CANCELLED | hub_manager | ✅ |
| BOOKED | PICKED_UP | hub_manager | ✅ |
| BOOKED | CANCELLED | hub_manager | ✅ |
| PICKED_UP | IN_TRANSIT | fleet_owner / hub_manager | ✅ |
| IN_TRANSIT | ARRIVED | hub_manager (dest hub) | ✅ |
| IN_TRANSIT | CANCELLED | fleet_owner only | ✅ |
| ARRIVED | OUT_FOR_DELIVERY | hub_manager | ✅ |
| OUT_FOR_DELIVERY | DELIVERED | hub_manager | ✅ |
| DELIVERED | anything | anyone | ❌ Reject |
| CANCELLED | anything | anyone | ❌ Reject |

### Invalid Transitions (must all be rejected)
```typescript
// These must all return an error, never succeed:
BOOKING_PENDING → IN_TRANSIT  // skipping steps
BOOKED → DELIVERED            // skipping steps
IN_TRANSIT → BOOKING_PENDING  // backwards
DELIVERED → CANCELLED         // terminal state
CANCELLED → BOOKED            // terminal state
```

### Audit Trail Verification
After each status transition, verify `lr_status_history` has a new row:
```sql
SELECT * FROM lr_status_history
WHERE lr_id = '<test_lr_id>'
ORDER BY changed_at DESC;
-- Must show: from_status, to_status, changed_by, changed_at
```

---

## 5. Form Validation Tests

Run these on every form that includes these field types:

### Indian Phone Numbers
| Input | Expected |
|---|---|
| `9876543210` | ✅ Valid |
| `+919876543210` | ✅ Valid |
| `1234567890` | ❌ Invalid (starts with 1) |
| `98765432` | ❌ Invalid (8 digits) |
| `0 9876543210` | ❌ Invalid (leading 0) |
| (empty) | ❌ Required field error |

### Vehicle Numbers
| Input | Expected |
|---|---|
| `MH 12 AB 1234` | ✅ Valid |
| `KA 01 C 5678` | ✅ Valid |
| `MH12AB1234` | ❌ Invalid (no spaces) |
| `AB 123 CD 1234` | ❌ Invalid (wrong format) |
| (empty) | ❌ Required field error |

### Currency / Freight Amounts
| Input | Expected |
|---|---|
| `5000` | ✅ Valid (displayed as ₹5,000.00) |
| `0` | ❌ Invalid (zero not allowed) |
| `-500` | ❌ Invalid (negative not allowed) |
| `abc` | ❌ Invalid (non-numeric) |
| (empty) | ❌ Required field error |

### GSTIN (optional field)
| Input | Expected |
|---|---|
| `22AAAAA0000A1Z5` | ✅ Valid |
| (empty) | ✅ Valid (optional) |
| `INVALIDGSTIN` | ❌ Invalid format |

---

## 6. UI Responsiveness Tests

Use the `automated-ui-verification` skill for screenshot capture. Verify:

| Check | Desktop 1440×900 | Mobile 375×812 |
|---|---|---|
| No horizontal scroll | ✅ | ✅ |
| Sidebar collapses on mobile | N/A | ✅ |
| LR table scrolls horizontally on mobile | N/A | ✅ |
| Forms stack vertically on mobile | N/A | ✅ |
| Buttons are tap-friendly (min 44px height) on mobile | N/A | ✅ |
| Text is legible (no overflow or clipping) | ✅ | ✅ |
| INR amounts show ₹ symbol correctly | ✅ | ✅ |

---

## 7. Keyboard-First Form Tests (Hub Manager UX)

1. Open LR creation form.
2. Tab through every field in order — verify tab order is logical (top to bottom, left to right).
3. Fill all fields using keyboard only (no mouse).
4. Press `Enter` on the last field or submit button — verify form submits.
5. After successful creation, verify focus returns to first field.
6. Verify dropdown fields (hub, payment mode) are keyboard-navigable.

---

## 8. To-Pay Collection Tests

| Scenario | Expected |
|---|---|
| Mark TO_PAY LR as DELIVERED | System prompts for collection details |
| Enter collected amount = freight amount | ✅ Saved correctly |
| Enter collected amount = 0 | ❌ Validation error |
| Enter collected amount > freight amount | ✅ Allowed (partial overpayment edge case) |
| Mark PAID LR as DELIVERED | No collection prompt shown |
| Fleet Owner views outstanding To-Pay dashboard | Shows correct uncollected total |

---

## 9. Customer Booking Form Tests (Public, Unauthenticated)

1. Navigate to `http://localhost:3000/book/sharma` without logging in.
2. **Assert**: Page loads (no auth redirect).
3. Submit with empty fields — **Assert**: Field-level errors shown.
4. Submit with invalid phone — **Assert**: Phone validation error shown.
5. Submit valid form — **Assert**: `booking_requests` row created with `status = PENDING`.
6. Navigate to `http://localhost:3000/book/invalid-slug` — **Assert**: 404 page shown.
7. Verify the booking request appears in Hub Manager's dashboard Pending Requests widget.

---

## Completion Gate

A task is only complete when ALL of the following pass:
- [ ] Multi-tenant isolation: Tenant B sees zero Tenant A records.
- [ ] Cross-hub isolation: Hub Manager cannot insert LRs for another hub.
- [ ] RBAC: Hub Manager blocked from fleet-owner-only routes/actions.
- [ ] State machine: All invalid transitions rejected.
- [ ] Audit trail: Every transition logged in `lr_status_history`.
- [ ] Form validation: All edge cases tested.
- [ ] Desktop screenshot at 1440×900 captured.
- [ ] Mobile screenshot at 375×812 captured — no horizontal scroll.
- [ ] Keyboard-only form completion verified.
