# SmartParcel — Phase 1.5 Implementation Plan

> Created: 2026-08-22  
> Status: **Approved — Ready for Development**  
> Pre-condition: Phase 1 (v1 MVP) 100% complete ✅

---

## Overview

Phase 1.5 is a web-only sprint (no Flutter required) that closes the two most painful operational gaps before mobile development begins:

1. **Driver Trip Expense Ledger** — per-trip cash advance and expense tracking with settlement
2. **WhatsApp Notifications via WATI** — automated status updates and payment reminders

---

## Feature 1: Driver Trip Expense Ledger

### Data Model

#### Migration: `20250101000011_trip_expenses.sql`

**`trip_expenses` table**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `trip_id` | uuid | FK → trips (`NOT NULL`) |
| `driver_id` | uuid | FK → drivers (**nullable**; auto-populated from `trips.default_driver_id` if assigned, null if no driver on trip) |
| `tenant_id` | uuid | RLS anchor (`NOT NULL`) |
| `category` | enum `trip_expense_category` | `ADVANCE`, `FUEL`, `TOLL`, `MAINTENANCE`, `BHATTA`, `LABOUR`, `MISC` |
| `amount` | bigint | In paise. **Positive = advance given. Negative = expense incurred.** |
| `description` | text | Free-text. **Mandatory when `category = 'MISC'`**, optional otherwise |
| `is_voided` | boolean | `DEFAULT false`. Immutable rows — to correct an entry, add a new row with the opposite sign and mark the original as voided. **No UPDATE/DELETE on expense rows.** |
| `voided_by` | uuid | FK → users (nullable; set when `is_voided = true`) |
| `voided_at` | timestamptz | Nullable; set when voided |
| `entered_by` | uuid | FK → users |
| `entered_at` | timestamptz | `DEFAULT now()` |
| `settlement_id` | uuid | FK → `trip_expense_settlements` (nullable; set when trip is settled) |

**`trip_expense_settlements` table**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `trip_id` | uuid | FK → trips (`UNIQUE` — one settlement per trip) |
| `net_balance` | bigint | `SUM(amount)` of all `trip_expenses` for this trip. Positive = driver owes company. Negative = company owes driver. |
| `settlement_mode` | enum | `CASH` / `UPI` / `BANK_TRANSFER` |
| `settled_by` | uuid | FK → users (must be `fleet_owner`) |
| `settled_at` | timestamptz | `DEFAULT now()` |
| `notes` | text | Optional remarks |
| `tenant_id` | uuid | RLS anchor |

**RLS Policies (both tables):**
- SELECT: `tenant_id = current_tenant_id()`
- INSERT on `trip_expenses`: `tenant_id = current_tenant_id()` AND `current_user_role() IN ('fleet_owner', 'hub_manager')`
- **UPDATE/DELETE on `trip_expenses`: DENIED for all roles — rows are immutable. Use void pattern to correct.**
- VOID (UPDATE `is_voided = true`): `current_user_role() IN ('fleet_owner', 'hub_manager')` — own entries only for hub_manager
- INSERT/DELETE on `trip_expense_settlements`: `current_user_role() = 'fleet_owner'` only
- UPDATE on `trip_expense_settlements`: DENIED — Fleet Owner must delete and re-create to amend a settlement

### Validation Schema

`lib/validations/trip-expense.ts`

```typescript
// Key fields
category: z.enum(['ADVANCE', 'FUEL', 'TOLL', 'MAINTENANCE', 'BHATTA', 'LABOUR', 'MISC'])
// Matches existing lr.ts string-parsed pattern:
amount_rupees: z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 500 or 500.50)')
  .transform(v => Math.round(parseFloat(v) * 100)) // converts to paise
  .refine(v => v >= 1, 'Amount must be at least ₹0.01')
description: z
  .string()
  .optional()
  // Zod superRefine: .min(2) enforced only when category === 'MISC'

// Settlement schema
settlement_mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER'])
notes: z.string().optional()
```

### Service Layer

`lib/services/trip-expense.ts`

- `addTripExpenseService(tripId, data, user)` — validates hub scope, converts rupees to paise, auto-populates `driver_id` from `trips.default_driver_id` (nullable if unassigned), inserts immutable row
- `voidTripExpenseService(expenseId, user)` — marks `is_voided = true`; hub_manager can void own entries only, fleet_owner can void any
- `getTripExpenseSummary(tripId)` — returns all non-voided entries + running balance; voided entries shown with strikethrough in UI
- `settleTripService(tripId, data, user)` — `fleet_owner` only; computes net balance from non-voided entries, inserts settlement row
- `reopenSettlementService(tripId, user)` — `fleet_owner` only; **deletes** the settlement row, freeing the trip for re-settlement after new entries are added

### UI

#### A. Expenses Tab inside `/trip-dispatches` side-drawer

- New **"Expenses"** tab alongside the existing cargo manifest tab
- Running balance summary header:
  - 🟢 Green: positive balance (driver owes company)
  - 🔴 Red: negative balance (company owes driver)
  - ⚪ Grey: zero balance (settled)
- Expense entry list (category badge, amount, description, entered-by, timestamp)
- **"Add Entry"** button → inline quick-add form (category select, amount, description)
  - **Keyboard-first:** Tab order: Category → Amount → Description → Submit. Enter key submits the form.
- **"Void"** icon on each entry row (replaces Edit/Delete) — opens confirmation dialog
- **"Settle Trip"** button (Fleet Owner only) → opens settlement modal
- **"Re-open Settlement"** button (Fleet Owner only, shown on settled trips) → confirmation dialog; deletes settlement and allows new entries + re-settlement

#### B. Dedicated `/trip-expenses` page

- Sidebar nav link (visible to both roles)
- Trip selector at top (searchable, shows trip route + vehicle)
- Full expense table: all 7 categories with color-differentiated amounts
  - Advances: **bold green**
  - Expenses: **regular red/muted**
- Running balance shown prominently per trip
- "Settle Trip" action button per unsettled trip
- Settled trips show ✅ badge with settlement date, mode, net balance
- Fleet Owner can **"Re-open"** a settled trip (delete settlement) to add missed entries and re-settle
- Voided entries shown with strikethrough and voided-by badge
- Empty state if no trips yet

#### C. Fleet Owner Dashboard widget

- New metric card: **"Unsettled Trips"**
  - Count of trips with expenses but no settlement
  - Total outstanding net balance (sum of all unsettled trips)
  - CTA → `/trip-expenses`

### RBAC Summary

| Action | Fleet Owner | Hub Manager |
|---|---|---|
| View expense ledger | ✅ | ✅ |
| Add expense entry | ✅ | ✅ |
| Void own entry | ✅ | ✅ (own entries only) |
| Void any entry | ✅ | ❌ |
| Settle trip | ✅ | ❌ |
| Re-open (delete) settlement | ✅ | ❌ |

---

## Feature 2: WhatsApp Notifications via WATI

### Pre-flight Requirements (Manual — Do Before Building)

> [!IMPORTANT]
> 1. Create and activate a WATI account with a WhatsApp Business number
> 2. Submit all 6 message templates to WATI for Meta approval (24–48 hrs)
> 3. Obtain WATI API endpoint URL and API token
> 4. Add to `.env.local`: `WATI_API_ENDPOINT`, `WATI_API_TOKEN`
> 5. Never prefix these with `NEXT_PUBLIC_`

### Message Templates

All templates must be pre-approved by Meta via WATI dashboard before deployment.

| Template Name | Trigger Event | Recipient | Key Variables |
|---|---|---|---|
| `lr_booking_confirmed` | LR → `BOOKED` | Consignor | `{{lr_number}}`, `{{from_hub}}`, `{{to_hub}}`, `{{freight_amount}}` + PDF attachment |
| `lr_in_transit` | LR → `IN_TRANSIT` | Consignor | `{{lr_number}}`, `{{vehicle_number}}`, `{{driver_name}}` |
| `lr_arrived` | LR → `ARRIVED` | Consignee | `{{lr_number}}`, `{{hub_name}}`, `{{hub_phone}}` |
| `lr_out_for_delivery` | LR → `OUT_FOR_DELIVERY` | Consignee | `{{lr_number}}`, `{{expected_date}}` |
| `lr_delivered` | LR → `DELIVERED` | Consignee | `{{lr_number}}`, `{{receiver_name}}`, `{{to_pay_amount}}` (conditional) |
| `payment_reminder` | Scheduled cron | Consignor/Consignee | `{{lr_number}}`, `{{outstanding_amount}}`, `{{days_overdue}}` |

### Architecture

#### Supabase Edge Function: `supabase/functions/whatsapp-notify/index.ts`

- Triggered by **Supabase DB Webhook** on `lorry_receipts` table — fires on `UPDATE` when `status` column changes
- Reads new status, fetches LR with related data (hubs, vehicle, driver, to_pay_collections)
- Selects correct template based on new status
- Checks `whatsapp_notifications_log` for idempotency (skip if already sent for this `lr_id` + `event_type`)
- Calls WATI `/api/v1/sendTemplateMessage` endpoint
- Writes result to `whatsapp_notifications_log`

#### Scheduled Payment Reminder: `supabase/functions/payment-reminder/index.ts`

- Triggered by **pg_cron**: `0 4 * * *` (UTC) = 10:00 AM IST daily
- **Recipient logic based on `payment_mode`:**
  - `TO_PAY` LR → send to `consignee_phone` (they owe the freight at delivery)
  - `PAID` LR → send to `consignor_phone` (they paid upfront; reminder is for any disputed outstanding)
  - `TBB` → no reminder (to-be-billed handled separately)
- Queries:
  ```sql
  SELECT lr.*, tpc.*
  FROM lorry_receipts lr
  LEFT JOIN to_pay_collections tpc ON tpc.lr_id = lr.id
  WHERE lr.status = 'DELIVERED'
    AND lr.payment_mode = 'TO_PAY'
    AND (tpc.collected IS NULL OR tpc.collected = false)
    AND lr.updated_at < now() - interval '3 days'
    AND lr.tenant_id IN (SELECT tenant_id FROM tenant_settings WHERE whatsapp_enabled = true)
  ```
- Sends `payment_reminder` template to `consignee_phone` (for TO_PAY)
- Logs to `whatsapp_notifications_log` with `reminder_sequence` incremented

### Data Model

#### Migration: `20250101000012_whatsapp_settings.sql`

**`tenant_settings` table**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK → tenants (`UNIQUE`) |
| `whatsapp_enabled` | boolean | Master toggle; default `false` |
| `wati_config` | jsonb | `{ "api_endpoint": "", "api_token": "" }` — encrypted at rest |
| `notification_preferences` | jsonb | `{ "BOOKED": true, "IN_TRANSIT": true, "ARRIVED": true, "OUT_FOR_DELIVERY": true, "DELIVERED": true, "PAYMENT_REMINDER": true }` |
| `payment_reminder_days` | integer | Days after delivery before first reminder; default `3` |
| `updated_at` | timestamptz | `DEFAULT now()` |

> [!CAUTION]
> The `wati_config` JSONB contains a live API token. Never expose this via any `NEXT_PUBLIC_` API call or client-side query. Read only from Supabase Edge Functions using the service role key.

**`whatsapp_notifications_log` table**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `lr_id` | uuid | FK → lorry_receipts |
| `event_type` | text | Matches template name (e.g., `lr_booking_confirmed`) |
| `recipient_phone` | text | E.164 format |
| `wati_message_id` | text | Response ID from WATI (for delivery status lookup) |
| `status` | enum | `SENT` / `FAILED` / `PENDING` |
| `error_message` | text | Nullable; WATI error response if `FAILED` |
| `sent_at` | timestamptz | `DEFAULT now()` |
| `tenant_id` | uuid | RLS anchor |

**Idempotency constraint for one-time events:**
```sql
UNIQUE (lr_id, event_type)
WHERE reminder_sequence IS NULL
```

**For payment reminders (repeating):**
- `reminder_sequence` column (integer, nullable): `NULL` for one-time events, `1`, `2`, `3`... for each successive reminder send
- Unique constraint: `UNIQUE (lr_id, event_type, reminder_sequence)` — enforced across all rows
- Cron function queries `MAX(reminder_sequence)` per `lr_id` and increments before inserting

This allows unlimited reminder sends while still preventing double-fires of one-time events.

### UI: `/settings` Route (Fleet Owner Only)

- **WhatsApp** section:
  - Master enable/disable toggle
  - WATI API Endpoint input (masked)
  - WATI API Token input (masked, write-only — never shown after save)
  - "Test Connection" button → pings WATI health endpoint
  - Per-event toggles for each of the 6 notification types
  - Payment reminder delay selector (1 / 3 / 7 / 14 days)
- Save action: writes to `tenant_settings` via Server Action
  > [!IMPORTANT]
  > The Server Action **must call `requireRole(['fleet_owner'])`** before using the Supabase admin client (`lib/supabase/admin.ts`). The admin client bypasses RLS entirely — the role check is the only gate. Even though the `/settings` page is middleware-protected, always double-enforce at the action level.

---

## Files to Create / Modify

### New Files

| File | Purpose |
|---|---|
| `supabase/migrations/20250101000011_trip_expenses.sql` | trip_expenses + settlements tables + RLS |

> [!WARNING]
> Before writing migrations, run `supabase migration list` to confirm the next safe sequence number. The numbers `000011` and `000012` are assumed but may conflict if any hotfix was applied between sessions.
| `supabase/migrations/20250101000012_whatsapp_settings.sql` | tenant_settings + whatsapp_notifications_log |
| `supabase/functions/whatsapp-notify/index.ts` | Edge Function — status-triggered WhatsApp sends |
| `supabase/functions/payment-reminder/index.ts` | Edge Function — scheduled payment follow-ups |
| `lib/validations/trip-expense.ts` | Zod schemas for expense entry + settlement |
| `lib/db/trip-expenses.ts` | Query helpers for expense + settlement tables |
| `lib/services/trip-expense.ts` | Business logic: add expense, settle trip |
| `lib/db/tenant-settings.ts` | Query helpers for settings |
| `app/(dashboard)/trip-expenses/page.tsx` | Full expense ledger page |
| `app/(dashboard)/trip-expenses/loading.tsx` | Skeleton loader |
| `app/(dashboard)/trip-expenses/actions.ts` | Server Actions: add entry, settle trip |
| `app/(dashboard)/trip-expenses/_components/ExpenseTable.tsx` | Per-trip expense table |
| `app/(dashboard)/trip-expenses/_components/AddExpenseDialog.tsx` | Add entry modal |
| `app/(dashboard)/trip-expenses/_components/SettleTripDialog.tsx` | Settlement modal |
| `app/(dashboard)/settings/page.tsx` | Tenant settings page |
| `app/(dashboard)/settings/actions.ts` | Save settings Server Action |
| `app/(dashboard)/settings/_components/WhatsAppSettings.tsx` | WATI config section |

### Modified Files

| File | Change |
|---|---|
| `app/(dashboard)/trip-dispatches/_components/` | Add "Expenses" tab to side-drawer |
| `app/(dashboard)/dashboard/page.tsx` | Add "Unsettled Trips" metric card |
| `components/shared/sidebar-nav.tsx` | Add "Trip Expenses" and "Settings" nav links |
| `lib/types/supabase.ts` | Regenerate after new migrations |

---

## Build Order

1. ✅ Write migrations (011, 012) → `supabase db reset` → regenerate types
2. ✅ Validation schemas + DB helpers + service layer
3. ✅ Server Actions
4. ✅ `/trip-expenses` page + components
5. ✅ `/settings` page + WhatsApp config section
6. ✅ Expense tab inside Trip Dispatch side-drawer
7. ✅ Dashboard unsettled trips widget
8. ✅ Supabase Edge Functions (whatsapp-notify + payment-reminder)
9. ✅ TypeScript check + lint + build
10. ✅ Browser subagent verification

---

## Verification Checklist

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run lint` → 0 warnings
- [ ] `npm run build` → all routes compile
- [ ] Add advance entry + 3 expense entries on a trip → verify running balance is correct (non-voided only)
- [ ] Void an expense entry → voided row shows strikethrough; balance updates
- [ ] Settle a trip as Fleet Owner → settlement badge appears, Hub Manager cannot settle
- [ ] Re-open settlement as Fleet Owner → settlement deleted, new entry can be added, re-settlement works
- [ ] Hub Manager cannot settle or re-open (RBAC verified)
- [ ] AddExpenseDialog: Tab order Category → Amount → Description → Submit; Enter key submits
- [ ] Amount field rejects non-numeric input (`abc`, `1.2.3`), accepts `500`, `500.50`
- [ ] MISC category without description shows field-level validation error
- [ ] `/trip-expenses` desktop (1440×900) + mobile (375×812) — no horizontal overflow
- [ ] WATI test message sends successfully from `/settings`
- [ ] `/settings` Server Action returns 403 if called by a hub_manager (role guard verified)
- [ ] `whatsapp_notifications_log` row written on LR status change
- [ ] Duplicate webhook does not create a second log entry (idempotency — one-time events)
- [ ] Payment reminder cron: second daily run creates a second log row with `reminder_sequence = 2` (repeating events allowed)
- [ ] Payment reminder sent to `consignee_phone` for TO_PAY LRs
- [ ] Payment reminder Edge Function returns correct LRs in dry-run mode

---

## Open Questions (Resolve Before Dev)

1. **WATI account ready?** Do you have a WATI account + WhatsApp Business number, or does that need to be created first?
2. **Template approval lead time:** Submit all 6 templates to Meta on Day 1 of this sprint — they need 24–48 hrs to approve.
3. **`tenant_settings.wati_config` encryption:** Supabase encrypts at rest by default, but consider using Supabase Vault (`pgsodium`) for the API token if you want column-level encryption. Decision needed before migration is written.
