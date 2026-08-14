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
* **Messaging:** WhatsApp Business API via **WATI** — for sending PDF LRs and live tracking links
* **Mapping & Geolocation:** **Google Maps API** for v1; migrate to MapmyIndia (Mappls API) in v2
* **Error Tracking:** Sentry

### **Deployment & Environments**
* **Web Hosting:** Vercel
* **Environments:** Two environments from day one:
  - `staging` — Supabase branch project + Vercel preview deployments
  - `production` — dedicated Supabase project (Mumbai) + Vercel production

---

## 4. Build Phases & Scope

### Phase 1 — v1 MVP (Web Admin Foundation)
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

### Phase 2 — v2 (Mobility & Customer Visibility)
| Feature | Notes |
|---|---|
| Flutter driver app | Offline-first QR scan + GPS location pings |
| Real-time vehicle tracking (Google Maps) | Fleet Owner sees live truck positions |
| LR status auto-update from QR scans | PICKED_UP / ARRIVED triggered by driver scan |
| POD photo capture | Driver takes delivery photo in Flutter app |
| WhatsApp notifications via WATI | PDF LR + tracking link sent on booking confirmation |
| Customer public tracking page | No login; shareable link per LR |
| Route rate card / pricing | Per-route per-kg pricing table |

### Phase 3 — v3 (Intelligence & Scale)
| Feature | Notes |
|---|---|
| Super-admin panel | Manage all tenants on the platform |
| E-Way Bill API integration | NIC portal auto-generation |
| GSTIN verification API | GST portal lookup |
| Financial reports & reconciliation | Monthly P&L, To-Pay outstanding, hub revenue |
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

### **Multi-Tenant Security Model**
Every database table (except global system metadata) must contain a `tenant_id UUID NOT NULL` column. RLS policies on every table link `tenant_id` to `auth.uid()`. No query runs without `tenant_id` context.

---

## 6. LR Status State Machine

```
Customer submits online booking
        │
        ▼
  BOOKING_PENDING  ──── Hub Manager rejects ────► CANCELLED
        │
        │ Hub Manager accepts (auto-creates LR)
        ▼
      BOOKED  ──────────────────────────────────► CANCELLED (Hub Manager, own hub only)
        │                                          (Fleet Owner can cancel any time)
        │ Hub Manager confirms goods loaded
        ▼
    PICKED_UP
        │
        │ Fleet Owner or Hub Manager dispatches trip
        ▼
    IN_TRANSIT  ──────────────────────────────────► CANCELLED (Fleet Owner only)
        │
        │ Destination Hub Manager confirms goods received
        ▼
     ARRIVED
        │
        │ Destination Hub Manager marks ready for pickup
        ▼
 OUT_FOR_DELIVERY
        │
        │ Destination Hub Manager marks delivered (captures POD + To-Pay)
        ▼
    DELIVERED  (terminal state — immutable)
```

### Who Triggers Each Transition

| Transition | Triggered By |
|---|---|
| → BOOKING_PENDING | System (auto, when customer submits form or Hub Manager creates LR) |
| → BOOKED | Hub Manager (at origin hub) — prints thermal receipt at this point |
| → PICKED_UP | Hub Manager (at origin hub) confirms goods loaded onto truck |
| → IN_TRANSIT | Fleet Owner or Hub Manager dispatches trip |
| → ARRIVED | Hub Manager (at destination hub) confirms receipt of goods |
| → OUT_FOR_DELIVERY | Hub Manager (at destination hub) |
| → DELIVERED | Hub Manager (at destination hub) — captures POD + To-Pay collection |
| → CANCELLED | Hub Manager (for BOOKING_PENDING/BOOKED at their hub only); Fleet Owner (any stage) |

---

## 7. Trip Model

* **One trip carries MANY LRs** (realistic truck loading — multiple Builties on one run).
* **Trip = vehicle + driver + route (from_hub → to_hub) + departure datetime + list of LRs**.
* Fleet Owner defines **recurring schedules** per route (e.g., MUM→DEL every Monday & Thursday).
* Hub Manager can create **ad-hoc one-off trips** as needed.
* When Hub Manager creates an LR, it **auto-assigns to the next scheduled trip** for that route. Hub Manager can override manually.
* Dispatching a trip sets all its LRs from PICKED_UP → IN_TRANSIT atomically.

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

| Action | Fleet Owner | Hub Manager |
|---|---|---|
| Register tenant / company profile | Yes | No |
| Invite & manage users | Yes | No |
| Manage hubs | Yes | No |
| Manage vehicles | Yes | No |
| Manage driver records | Yes | No |
| Define trip schedules | Yes | No |
| Create ad-hoc trip | Yes | Yes |
| Create LR (Hub Manager direct) | Yes | Yes (own hub only) |
| Accept/reject customer booking requests | Yes | Yes (own hub only) |
| View all LRs (all hubs) | Yes | Yes (read-only for other hubs) |
| Edit LR | Yes | Yes (own hub, BOOKING_PENDING/BOOKED only) |
| Cancel LR (BOOKING_PENDING/BOOKED) | Yes | Yes (own hub only) |
| Cancel LR (IN_TRANSIT or later) | Yes | No |
| Dispatch trip (IN_TRANSIT) | Yes | Yes |
| Confirm ARRIVED (destination hub) | Yes | Yes (own hub only) |
| Mark OUT_FOR_DELIVERY | Yes | Yes (own hub only) |
| Mark DELIVERED + capture POD | Yes | Yes (own hub only) |
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

| Table | Description |
|---|---|
| `tenants` | Root account for each logistics company |
| `users` | All users; `user_role` column mirrors JWT claim |
| `hubs` | Branch/hub locations |
| `vehicles` | Truck registry |
| `drivers` | Driver profiles (web records in v1; linked to user account in v2) |
| `trip_schedules` | Recurring route schedules defined by Fleet Owner |
| `trips` | One trip = one vehicle + driver + route + many LRs |
| `booking_requests` | Raw customer submissions from public booking form |
| `lorry_receipts` | Core LR document |
| `lr_status_history` | Immutable audit log of every LR status transition |
| `to_pay_collections` | Cash/UPI collection record for To-Pay LRs |
| `proof_of_deliveries` | POD record (receiver name, timestamp, photo in v2) |
| `location_pings` | GPS breadcrumbs from driver (v2) |
| `qr_scans` | Load/unload scan events (v2) |

---

## 20. Freight Pricing (v1)
Hub Manager manually enters the final freight amount (₹) when creating an LR. No automatic rate card in v1. Amount stored in **paise** (bigint integer).
