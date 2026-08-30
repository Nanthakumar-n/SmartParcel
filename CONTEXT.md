# Project Context: SmartParcel (Smart Delivery & Fleet Automation)

## 1. Executive Summary & Vision
**SmartParcel** is a light, multi-tenant B2B logistics & fleet management platform built specifically for small Indian logistics operators (owning 10–20 trucks) carrying goods between tier-1, tier-2, and tier-3 towns.

Current operations rely heavily on physical paper waybills (Lorry Receipts / *Builty*), phone calls to drivers, manual hub updates, and unverified branch receipts. SmartParcel replaces this fragmented process with digital billing, real-time dispatch tracking, automated customer WhatsApp updates, and offline-capable mobile tools for drivers and hub managers.

---

## 2. Target Persona & Stakeholders
1. **Fleet Owners / Logistics Directors:** Need complete visibility on fleet performance, total freight collected, active trips, and zero data leaks between companies.
2. **Hub / Branch Managers:** Need rapid data-entry interfaces (keyboard-first) to issue digital Lorry Receipts (LR), print thermal bills, assign cargo to trucks, and confirm incoming dispatches.
3. **Truck Drivers:** Low digital literacy; operating on low-end Android devices with spotty highway connectivity. Need large buttons, offline-first workflows, and simple QR code scanning for loading/unloading.
4. **Senders & Receivers (SMB Customers):** Require instant digital bills, accurate delivery estimates, transparent pricing, and simple tracking without downloading a mandatory mobile application.

---

## 3. Core Tech Stack & Architecture

### **Frontend & Web Admin**
* **Framework:** Next.js 14+ (App Router, Server Actions, React Server Components)
* **Styling & UI:** Tailwind CSS, `shadcn/ui`, Lucide Icons
* **Theme:** Light theme (clean, readable in bright hub environments)
* **Printing:** Browser-based raw thermal printing (3-inch paper) & PDF rendering (`@react-pdf/renderer`)
* **Error Monitoring:** Sentry (enabled from day one)

### **Mobile App (Drivers & Pickups)**
* **Framework:** Flutter (Android & iOS)
* **State Management:** Flutter Riverpod
* **Offline Database:** Hive for offline caching of QR scans and location updates
* **Scope:** Flutter app is **NOT in v1 MVP** — web admin only for v1

### **Backend, Database & Security**
* **Platform:** Supabase
* **Database:** PostgreSQL with Row-Level Security (RLS) strictly enforced
* **Auth:** Supabase Auth (Phone OTP & Email/Password with custom JWT Claims for Roles)
* **Realtime:** Supabase Realtime Channels for live vehicle location and status dashboards
* **Regions:**
  - Development: `us-east-1`
  - Production: `ap-south-1` (Mumbai) — lowest latency for Indian users

### **External Services & APIs**
* **Messaging:** WhatsApp Business API via **WATI** — Phase 1.5: LR PDF delivery, status triggers, payment reminders. Phase 2a: tracking links, POD photo notifications.
* **Mapping & Geolocation:** **Google Maps API** for v1/v2a; migrate to MapmyIndia (Mappls API) in v3
* **FASTag / Toll:** NHAI FASTag API — auto-import toll transactions per vehicle (Phase 2b)
* **Error Tracking:** Sentry

### **Deployment & Environments**
* **Web Hosting:** Vercel
* **Environments:** Two environments from day one:
  - `staging` — Supabase branch project + Vercel preview deployments
  - `production` — dedicated Supabase project (Mumbai) + Vercel production

---

## 4. Build Phases & Scope

### Phase 1 — v1 MVP (Web Admin Foundation) ✅ COMPLETE
**Goal:** Hub Managers can fully digitize daily LR operations. Fleet Owners have real-time visibility.

| Feature | Notes |
|---|---|
| Supabase DB schema + RLS migrations | All tables, policies, triggers |
| Tenant self-registration | Fleet Owner registers company via public sign-up |
| User management | Fleet Owner invites Hub Managers by phone/email; assigns them to hubs |
| Hub / branch management | Create hubs with code, name, address, geolocation, contact phone |
| Vehicle registry | Registration number, type, capacity, assigned driver, status |
| Driver registry | Name, phone, license — web records only (no login in v1) |
| Trip scheduling | Fleet Owner defines recurring route schedules (e.g. MUM→DEL every Mon/Thu); Hub Manager can create ad-hoc trips |
| LR creation (Hub Manager direct) | Keyboard-first form; auto-slots into next scheduled trip for route |
| Customer online booking form | Public URL per tenant (smartparcel.in/book/[tenant-slug]); no login required |
| Booking requests queue | Hub Manager dashboard widget; accept = creates LR in BOOKING_PENDING |
| LR full lifecycle management | Status transitions per state machine (see Section 6) |
| LR audit trail | `lr_status_history` table; written by application on each transition |
| Proof of Delivery (POD) | Receiver name + timestamp captured when marking DELIVERED |
| To-Pay collection record | Collected flag, amount, collected-by, datetime, payment mode |
| LR listing with search & filters | Status, date range, hub, LR number, consignor/consignee name/phone |
| LR thermal print (3-inch) + PDF | Issued to consignor at booking |
| Fleet Owner dashboard | Active LRs by status, monthly freight ₹, hub breakdown, outstanding To-Pay, vehicles IN_TRANSIT, recent LRs |
| Sentry error monitoring | Configured from day one |

### Phase 1.5 — Web-Only Sprint (No Flutter Required)
**Goal:** Close the most painful operational gaps for fleet owners before mobile development begins.

#### Driver Trip Expense Ledger ✅ COMPLETE
| Feature | Notes |
|---|---|
| `trip_expenses` table | Positive amounts = advance given to driver; negative = expense incurred. Categories: `ADVANCE`, `FUEL`, `TOLL`, `MAINTENANCE`, `BHATTA`, `LABOUR`, `MISC` |
| `trip_expense_settlements` table | One settlement record per trip; net balance auto-computed; settlement mode: `CASH` / `UPI` / `BANK_TRANSFER` |
| Expense summary in Trip Dispatch | New "Expenses" tab in existing trip side-drawer; running balance shown with color coding and settlement closing row |
| Dedicated `/trip-expenses` route | Full per-trip ledger, all categories, running balance, "Settle Trip" action, settlement balancing row, and re-open capability |
| RBAC | Both Fleet Owner and Hub Manager can add entries; only Fleet Owner can settle/re-open a trip |
| Dashboard widget | Unsettled trips count + total outstanding balance on Fleet Owner dashboard |

#### WhatsApp Notifications via WATI
| Feature | Notes |
|---|---|
| Supabase Edge Function (`whatsapp-notify`) | Triggered by DB webhook on `lorry_receipts.status` change; idempotent via `whatsapp_notifications_log` |
| LR Booking Confirmed (`BOOKED`) | PDF LR sent to consignor via WhatsApp |
| Trip Dispatched (`IN_TRANSIT`) | Consignor notified with truck number |
| Arrived at Destination (`ARRIVED`) | Consignee notified with hub contact |
| Out for Delivery (`OUT_FOR_DELIVERY`) | Consignee gets "on the way" alert |
| Goods Delivered (`DELIVERED`) | Consignee gets delivery confirmation + To-Pay amount if applicable |
| Payment Reminder (scheduled cron) | pg_cron daily at 10:00 AM IST; targets `To-Pay` LRs overdue by 3+ days |
| `/settings` route | Fleet Owner manages WATI credentials, per-event notification toggles |
| `tenant_settings` table | Stores per-tenant WATI config and notification preferences |

### Phase 2a — Flutter & Mobility
**Goal:** Give drivers a mobile tool and give fleet owners live tracking.

| Feature | Notes |
|---|---|
| Flutter driver app | Offline-first QR scan + GPS location pings (Riverpod + Hive) |
| Real-time vehicle tracking (Google Maps) | Fleet Owner sees live truck positions |
| LR status auto-update from QR scans | `PICKED_UP` / `ARRIVED` triggered by driver scan |
| POD photo capture | Driver takes delivery photo; stored in Supabase Storage |
| Automated POD notifications | Phase 1.5 sends text-only delivery confirmation. Phase 2a enhancement: **attach POD photo** (captured via Flutter) to the same DELIVERED WhatsApp message |
| Customer public tracking page | No login; shareable `/track/[lr_number]` link |
| Driver expense entry from Flutter | Driver submits expense entries + bill photo from app; linked to Phase 1.5 `trip_expenses` table |
| Expense approval workflow | Driver submits → Hub Manager approves → Fleet Owner settles |
| Route rate card / pricing | Per-route per-kg pricing table |

### Phase 2b — Financial Reports & Advanced Expenses
**Goal:** Give fleet owners analytical tools to understand profitability and automate expense capture.

| Feature | Notes |
|---|---|
| Dedicated `/reports` route | Fleet Owner only |
| Monthly P&L report | Freight revenue vs. total trip expenses per month |
| Hub revenue breakdown | Revenue and shipment count per hub |
| Vehicle-wise P&L | Freight earned per vehicle vs. total expenses on that vehicle |
| Route-wise cost analysis | Average expense per trip on each route corridor |
| Outstanding To-Pay aging report | Receivables overdue by 0–7, 7–30, 30+ days |
| FastTag auto-import | Pull toll transactions from NHAI FASTag API by vehicle reg number; auto-create `TOLL` expense entries |
| Export to Excel / PDF | Download any report |

### Phase 3 — v3 (Intelligence & Scale)
| Feature | Notes |
|---|---|
| Super-admin panel | Manage all tenants on the platform |
| E-Way Bill API integration | NIC portal auto-generation |
| GSTIN verification API | GST portal lookup |
| Multi-stop / transhipment trips | Goods passing through intermediate hubs |
| Damage & claims workflow | Dispute resolution record |
| SaaS billing & subscriptions | Per-tenant plan management |
| MapmyIndia migration | Replace Google Maps for better tier-2/3 coverage |

---

## 5. Domain & Data Architecture Rules

### **Localized Data Formats**
* **Phone Numbers:** Indian standard `+91 XXXXX-XXXXX` (10 digits). Regex: `/^(\+91)?[6-9]\d{9}$/`. Store in E.164 format (`+919876543210`).
* **Vehicle Numbers:** Indian state registration format. Examples: `KA 01 AB 1234`, `MH 12 C 5678`. Regex: `/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/`. Store uppercase.
* **Currency:** Indian Rupee (`₹` / INR) with Indian numbering (e.g., `₹1,00,000`). Use `Intl.NumberFormat('en-IN')`. **Store all amounts in paise (bigint integer, 1 INR = 100 paise).**
* **Taxation:** GSTIN: 15-character alphanumeric. Pin Codes: 6-digit. Regex: `/^\d{6}$/`.

### **Expense Category Enum** (`trip_expense_category`)
| Value | Description |
|---|---|
| `ADVANCE` | Cash advance given to driver before/during trip — stored as **positive** paise |
| `FUEL` | Diesel/petrol fill on the road — stored as **negative** paise |
| `TOLL` | Highway toll / FastTag charge — stored as **negative** paise |
| `MAINTENANCE` | Roadside repair or breakdown cost — stored as **negative** paise |
| `BHATTA` | Driver daily allowance (food/stay) — stored as **negative** paise |
| `LABOUR` | Loading/unloading labour paid by driver — stored as **negative** paise |
| `MISC` | Miscellaneous; free-text description required — stored as **negative** paise |

Running balance = `SUM(amount)` on a trip. **Positive balance → driver owes company. Negative balance → company owes driver.**

### **Multi-Tenant Security Model**
Every database table (except global system metadata) must contain a `tenant_id UUID NOT NULL` column. RLS policies on every table link `tenant_id` to `auth.uid()`. No query runs without `tenant_id` context.

---

## 6. LR Status State Machine

> ⚠️ **Updated 2026-08-23** — See [`LIFECYCLE.md`](./LIFECYCLE.md) for the full canonical specification. Summary below reflects current agreed design.

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
        │
        │ Trip dispatched (all assigned BOOKED LRs → IN_TRANSIT atomically)
        ▼
    IN_TRANSIT  ──────────────────────────────────► CANCELLED (Fleet Owner only)
        │                                            LRs revert to BOOKED, vehicle → AVAILABLE
        │
        │ Trip marked ARRIVED (Hub Manager at destination, or Fleet Owner)
        ▼
     ARRIVED  (all LRs on trip arrive simultaneously)
        │
        │ Hub Manager (destination) or Fleet Owner marks individual LR delivered
        ▼
    DELIVERED  (terminal state — immutable)
```

**Deprecated statuses (do NOT use in new code):** ~~`PICKED_UP`~~, ~~`OUT_FOR_DELIVERY`~~ — removed from active flow per 2026-08-23 design review. May still exist in DB enum for migration safety.

### Who Triggers Each Transition

| Transition | Triggered By | Hub Scope |
|---|---|---|
| → `BOOKING_PENDING` | System (auto on customer web form) | — |
| → `BOOKED` | Hub Manager (accept booking request) or direct LR creation | Origin hub |
| → `IN_TRANSIT` | Fleet Owner or Hub Manager — via Trip Dispatch | Origin hub |
| → `ARRIVED` | Fleet Owner or Hub Manager — via Trip "Mark Arrived" | Destination hub only |
| → `DELIVERED` | Fleet Owner or Hub Manager | Destination hub only |
| → `CANCELLED` (BOOKING_PENDING/BOOKED) | Fleet Owner or Hub Manager | Own hub only |
| → `CANCELLED` (IN_TRANSIT) | Fleet Owner only | Any |

---

## 7. Trip Model

> ⚠️ **Updated 2026-08-23** — See [`LIFECYCLE.md`](./LIFECYCLE.md) §3 for the full trip lifecycle specification.

* **One trip carries MANY LRs** (realistic truck loading — multiple Builties on one run).
* **Trip = vehicle + route (from_hub → to_hub) + departure datetime + list of LRs**. Driver is optional (contractor trucks allowed).
* Fleet Owner defines **recurring schedules** per route (e.g., MUM→DEL every Monday & Thursday).
* Hub Manager can create **ad-hoc one-off trips** as needed.
* When a **trip is created**, the system **auto-assigns** all BOOKED LRs with `trip_id IS NULL` matching the route. Hub Manager can manually add or remove LRs before dispatch.
* **Dispatching** a trip atomically moves all assigned BOOKED LRs → `IN_TRANSIT`. Vehicle → `IN_TRANSIT`.
* **Marking a trip ARRIVED** atomically moves all its IN_TRANSIT LRs → `ARRIVED`. Vehicle → `AVAILABLE`. Trip → `COMPLETED`.
* **Cancelling a SCHEDULED trip** releases all assigned LRs back to pool (`trip_id = NULL`, status stays BOOKED).
* **Cancelling an IN_TRANSIT trip** (Fleet Owner only) reverts all IN_TRANSIT LRs → BOOKED + `trip_id = NULL`. Vehicle → `AVAILABLE`.
* A **vehicle must be assigned** before a trip can be dispatched. Driver assignment is optional.

---

## 8. Lorry Receipt (LR / Builty) — Full Field List

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `lr_number` | string | Auto-generated: `{HUB_CODE}-{YYYY}-{6-digit seq}` e.g. `MUM-2025-000123` |
| `booking_date` | date | Date the LR was created |
| `source` | enum | `HUB_DIRECT` (created by Hub Manager) / `CUSTOMER_REQUEST` (from booking form) |
| `from_hub_id` | uuid | Origin hub (FK → hubs) |
| `to_hub_id` | uuid | Destination hub (FK → hubs) |
| `trip_id` | uuid | Assigned trip (FK → trips; nullable until assigned) |
| `consignor_name` | string | Sender's full name |
| `consignor_phone` | string | E.164 format (+91...) |
| `consignor_gstin` | string | 15-char GSTIN (optional) |
| `consignee_name` | string | Receiver's full name |
| `consignee_phone` | string | E.164 format (+91...) |
| `consignee_gstin` | string | 15-char GSTIN (optional) |
| `goods_description` | string | Description of goods |
| `quantity` | integer | Number of items/units |
| `weight_kg` | decimal | Total weight in kilograms |
| `num_packages` | integer | Number of boxes/packages |
| `freight_amount` | bigint | In paise (₹ × 100); entered manually by Hub Manager |
| `payment_mode` | enum | `PAID` / `TO_PAY` / `TBB` |
| `expected_delivery_date` | date | Optional |
| `status` | enum | See state machine in Section 6 |
| `tenant_id` | uuid | RLS anchor |
| `created_by` | uuid | FK → users |

---

## 9. To-Pay Collection Record

Captured when Hub Manager marks LR as DELIVERED and payment_mode = TO_PAY.
Stored in a separate `to_pay_collections` table (not on the LR row itself).

| Field | Notes |
|---|---|
| `collected` | Boolean |
| `amount_collected` | Bigint (paise); auto-filled from LR freight_amount, editable |
| `collected_by` | Name of Hub Manager or Driver who collected |
| `collected_at` | Timestamp (auto-stamped) |
| `payment_mode` | `CASH` / `UPI` / `BANK_TRANSFER` |
| `lr_id` | FK → lorry_receipts |
| `tenant_id` | RLS anchor |

---

## 10. Proof of Delivery (POD)

Captured when marking LR as DELIVERED. Stored in a separate `proof_of_deliveries` table.

| Field | Notes |
|---|---|
| `receiver_name` | Name of person who received the goods |
| `delivered_at` | Timestamp (auto-stamped) |
| `photo_url` | Nullable; photo upload deferred to v2 Flutter app |
| `notes` | Optional remarks |
| `lr_id` | FK → lorry_receipts |
| `tenant_id` | RLS anchor |

---

## 11. LR Audit Trail

Every status transition is written to `lr_status_history` by application code.

| Field | Notes |
|---|---|
| `lr_id` | FK → lorry_receipts |
| `from_status` | Previous status |
| `to_status` | New status |
| `changed_by` | FK → users |
| `changed_at` | Timestamp |
| `notes` | Optional reason / remarks |
| `tenant_id` | RLS anchor |

---

## 12. Role-Based Access Control (RBAC)

### Role Hierarchy (per tenant)
```
Fleet Owner
    └── Hub Manager (assigned to one or more hubs)
            └── Driver (Flutter app only in v2; no web admin access in v1)
```

### Role Storage
Roles stored as **Supabase custom JWT claims**. Claim key: `user_role`. Values: `fleet_owner`, `hub_manager`, `driver`.

### Permission Matrix

> ⚠️ **Updated 2026-08-23** — Reflects revised lifecycle. PICKED_UP and OUT_FOR_DELIVERY actions removed.

| Action | Fleet Owner | Hub Manager |
|---|---|---|
| Register tenant / company profile | Yes | No |
| Invite & manage users | Yes | No |
| Manage hubs | Yes | No |
| Manage vehicles | Yes | No |
| Manage driver records | Yes | No |
| Define trip schedules | Yes | No |
| Create ad-hoc trip | Yes | Yes (origin = own hub) |
| Assign / remove LRs from trip manifest | Yes | Yes (origin hub only) |
| Create LR (Hub Manager direct) | Yes | Yes (own hub only) |
| Accept/reject customer booking requests | Yes | Yes (own hub only) |
| View all LRs (all hubs) | Yes | Yes (read-only for other hubs) |
| Edit LR | Yes | Yes (own hub, BOOKING_PENDING/BOOKED only) |
| Cancel LR (BOOKING_PENDING/BOOKED) | Yes | Yes (own hub only) |
| Cancel LR (IN_TRANSIT or later) | Yes | No |
| Dispatch trip (SCHEDULED → IN_TRANSIT) | Yes | Yes (origin hub only) |
| Mark trip Arrived (IN_TRANSIT → COMPLETED) | Yes | Yes (destination hub only) |
| Cancel trip (SCHEDULED) | Yes | Yes (origin hub only) |
| Cancel trip (IN_TRANSIT) | Yes | No |
| Mark LR DELIVERED + capture POD | Yes | Yes (destination hub only) |
| Record To-Pay collection | Yes | Yes |
| Print LR thermal / PDF | Yes | Yes |
| View Fleet Owner dashboard | Yes | No |
| View Hub Manager dashboard | Yes | Yes |
| Access web admin | Yes | Yes |
| Access Flutter driver app | No | No (v2 Driver role only) |

---

## 13. LR Numbering Convention
Format: `{HUB_CODE}-{YYYY}-{6-digit zero-padded sequence}`
- Example: `MUM-2025-000123`
- Sequence is per hub per year, resetting at year rollover.
- `HUB_CODE` is the short uppercase code set when a hub is created (e.g., `MUM`, `DEL`, `BLR`).
- Implemented as a Postgres sequence + trigger per hub.

---

## 14. Hub Fields
| Field | Notes |
|---|---|
| `hub_code` | Short uppercase tag (e.g., MUM, DEL, BLR) — used in LR numbering |
| `name` | Full hub name (e.g., "Mumbai Central Hub") |
| `address_line1` | Street / building |
| `city` | City |
| `state` | Indian state name |
| `pin_code` | 6-digit PIN |
| `latitude` | Decimal (6 places) |
| `longitude` | Decimal (6 places) |
| `contact_phone` | E.164 format |
| `tenant_id` | RLS anchor |

---

## 15. Vehicle Fields
| Field | Notes |
|---|---|
| `registration_number` | Indian format (e.g., MH 12 AB 1234) |
| `vehicle_type` | Enum: `TRUCK` / `MINI_TRUCK` / `TEMPO` |
| `capacity_tonnes` | Decimal |
| `default_driver_id` | FK → drivers (can be overridden per trip) |
| `status` | Enum: `AVAILABLE` / `IN_TRANSIT` / `UNDER_MAINTENANCE` |
| `tenant_id` | RLS anchor |

---

## 16. Customer Booking Flow (v1)
1. Customer visits `smartparcel.in/book/[tenant-slug]` — no login required.
2. Fills in: name, phone, origin city, destination city, goods description, quantity, weight.
3. Submission creates a row in `booking_requests` table with status `PENDING`.
4. Customer receives booking reference number (and SMS/WhatsApp confirmation in v2).
5. Hub Manager sees a **Pending Requests** badge on their dashboard.
6. Hub Manager reviews and **accepts** → system creates an LR in `BOOKING_PENDING` status pre-filled with customer data.
7. Hub Manager **rejects** → booking request marked `REJECTED`; customer notified (v2).

---

## 17. Fleet Owner Dashboard Widgets (v1)
1. Active LR counts by status (BOOKING_PENDING / BOOKED / IN_TRANSIT / ARRIVED / OUT_FOR_DELIVERY)
2. Total freight booked this month (₹)
3. Hub-wise LR count breakdown (table or bar chart)
4. Outstanding To-Pay collection amount (₹ uncollected)
5. Vehicles currently IN_TRANSIT with their route
6. Recent LRs list (last 10, with status badges)

---

## 18. LR List Search & Filters
- Filter by status
- Filter by date range (booking date)
- Filter by origin hub / destination hub
- Search by LR number (exact or partial)
- Search by consignor or consignee name/phone

---

## 19. Core Database Tables (Complete ERD Summary)

| Table | Phase | Description |
|---|---|---|
| `tenants` | v1 | Root account for each logistics company |
| `users` | v1 | All users; `user_role` column mirrors JWT claim |
| `hubs` | v1 | Branch/hub locations |
| `vehicles` | v1 | Truck registry |
| `drivers` | v1 | Driver profiles (web records in v1; linked to user account in v2a) |
| `trip_schedules` | v1 | Recurring route schedules defined by Fleet Owner |
| `trips` | v1 | One trip = one vehicle + driver + route + many LRs |
| `booking_requests` | v1 | Raw customer submissions from public booking form |
| `lorry_receipts` | v1 | Core LR document |
| `lr_status_history` | v1 | Immutable audit log of every LR status transition |
| `to_pay_collections` | v1 | Cash/UPI collection record for To-Pay LRs |
| `proof_of_deliveries` | v1 | POD record (receiver name, timestamp, photo in v2a) |
| `trip_expenses` | v1.5 | Per-trip expense & advance ledger; positive = advance, negative = expense |
| `trip_expense_settlements` | v1.5 | One settlement record per trip at trip close; net balance computed |
| `tenant_settings` | v1.5 | Per-tenant WATI config and per-event notification preferences (JSONB) |
| `whatsapp_notifications_log` | v1.5 | Idempotent log of every WhatsApp message sent via WATI; prevents duplicate sends |
| `location_pings` | v2a | GPS breadcrumbs from driver Flutter app |
| `qr_scans` | v2a | Load/unload scan events from driver Flutter app |

---

## 20. Freight Pricing (v1)
Hub Manager manually enters the final freight amount (₹) when creating an LR. No automatic rate card in v1. Amount stored in **paise** (bigint integer).

---

## 21. Development & Testing Seed Data

A comprehensive CLI seeding tool (`scripts/seed/index.ts`) populates realistic Indian logistics datasets, multi-hub manager logins, and entities across all lifecycle states.

### CLI Seeding Commands
| Command | Preset / Mode | Description |
|---|---|---|
| `npm run db:seed` | `full` (Default) | Cleans previous transactions & seeds a complete ecosystem across all lifecycle states. |
| `npm run db:seed:base` | `base` | Seeds Tenant, 4 Users, 3 Hubs, 4 Vehicles, and 4 Drivers without transactions. |
| `npm run db:seed:ops` | `ops` | Focuses on active operational queues (Pending Bookings + Pool `BOOKED` LRs + Scheduled Trips). |
| `npm run db:seed:append` | `append` | Runs full seed on top of existing database records without wiping. |

### Seeded Test Logins (Default Password: `Password123!`)
- **Fleet Owner**: `kishore@patelroadways.com` *(All Hubs / Tenant Admin)*
- **Mumbai Hub Manager**: `mum.manager@patelroadways.com` *(Assigned to `MUM` Hub)*
- **Delhi Hub Manager**: `del.manager@patelroadways.com` *(Assigned to `DEL` Hub)*
- **Bangalore Hub Manager**: `blr.manager@patelroadways.com` *(Assigned to `BLR` Hub)*

### Seeded Datasets & Scenarios
1. **Hubs**: Mumbai Central (`MUM`), Delhi North (`DEL`), Bangalore Electronic City (`BLR`).
2. **Fleet**: 4 Drivers (with Indian DL numbers) and 4 Vehicles (TRUCK, MINI_TRUCK, TEMPO with `current_hub_id` and driver assignments).
3. **Customer Booking Requests**: 2 `PENDING` bookings ready for conversion, 1 `REJECTED` booking.
4. **Lorry Receipts Across Lifecycle**:
   - `BOOKED` (Pool & Scheduled)
   - `IN_TRANSIT` (Active highway freight)
   - `ARRIVED` (Stationed at destination hub)
   - `DELIVERED` (With signed PODs and collected To-Pay cash/UPI records)
   - `CANCELLED` (With audit trail notes)
5. **Trips**: `SCHEDULED`, `IN_TRANSIT`, `COMPLETED` with vehicle location sync.
6. **Trip Expense Ledgers (Phase 1.5)**: Active in-transit trip ledger (advances, fuel, toll, bhatta), settled trip ledger (UPI), and unsettled completed trip ledger for settlement testing.

