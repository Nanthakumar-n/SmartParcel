# SmartParcel — Build Progress

> This file is the handoff document between sessions.
> Update it at the END of every coding session before closing the chat.
> A new agent should read this FIRST (after CONTEXT.md) to know exactly where to pick up.

---

## Current Phase
**Phase 1 — Foundation & Core Booking (v1 Web Admin)**

## Current Status
🟡 **Pre-build — Environment & Architecture Complete. No code written yet.**

---

## ✅ Completed (Session 1 — 2026-08-12)

### Architecture & Planning
- [x] Full project context documented in `CONTEXT.md` (20 sections)
- [x] V1 MVP scope locked — web admin only, Flutter deferred to v2
- [x] LR lifecycle state machine defined (8 statuses, transition rules, actor ownership)
- [x] Trip model defined — one trip carries many LRs; auto-slot to scheduled trip
- [x] RBAC permission matrix locked — fleet_owner / hub_manager / driver
- [x] Customer online booking flow defined (public URL → booking_requests → Hub Manager queue)
- [x] Database ERD completed — 14 tables defined
- [x] LR numbering convention locked: `{HUB_CODE}-{YYYY}-{6-digit seq}`
- [x] Freight pricing: manual entry by Hub Manager (no rate card in v1)

### Agent Skills (9 total — all production-ready)
- [x] `developer-standards` — Next.js App Router, Server Actions, Zod, shadcn/ui
- [x] `multi-tenant-rls` — corrected RLS pattern, hub-scoped & anon policies
- [x] `india-domain-formatting` — phone, vehicle, GSTIN, INR, paise
- [x] `mobile-offline-first` — Flutter Hive/Riverpod (v2 scope)
- [x] `automated-ui-verification` — browser sub-agent screenshot/recording
- [x] `qa-verification` — full test suite with seed data and completion gate
- [x] `rbac-auth` — JWT claims, middleware, role guards
- [x] `lr-state-machine` — transition rules, audit trail, dispatch pattern
- [x] `code-review` — 11-section checklist, sign-off gate

### Workspace Configuration
- [x] `.agents/AGENTS.md` — workspace rules, skill triggers, version constraints
- [x] `REQUIREMENTS.md` — full tool version table + installation scripts

### Environment Setup (macOS arm64)
- [x] Node.js v20.20.2 LTS (via nvm, default alias set)
- [x] npm 10.8.2
- [x] nvm 0.40.1
- [x] Supabase CLI 2.114.0 (binary at `~/.local/bin/supabase`)
- [x] Docker Desktop (installed at `/Applications/Docker.app` — needs one-time manual launch)
- [x] Vercel CLI 58.10.0
- [x] Git 2.39.5 ✅
- [x] Xcode 16.2 ✅
- [x] CocoaPods 1.16.2 ✅
- [x] Flutter 3.27.2 ✅
- [x] `.nvmrc` = `20` in project root

---

## 🔲 Up Next — Start Here in Next Session

### Step 1: Open Docker Desktop
Before any Supabase work, open `/Applications/Docker.app`, accept terms, and wait for the engine to start (whale icon in menu bar goes steady).

### Step 2: Scaffold Next.js Project
```bash
cd /Users/nantha/Documents/Projects/SmartParcel
npx create-next-app@14.2.x ./ --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

### Step 3: Install Core Dependencies
```bash
npm install @supabase/ssr@0.5.x @supabase/supabase-js@2.x zod react-hook-form @hookform/resolvers @sentry/nextjs sonner
npm install -D @types/node
```

### Step 4: Initialise shadcn/ui
```bash
npx shadcn@latest init
```

### Step 5: Initialise Supabase Local Dev
```bash
supabase init
supabase start   # Docker must be running
```

### Step 6: Write Database Migrations (in order)
1. `tenants` + RLS
2. `users` + JWT claims function + `user_hub_assignments`
3. `hubs` + RLS + LR sequence tables
4. `vehicles` + `drivers` + RLS
5. `trip_schedules` + `trips` + RLS
6. `booking_requests` + anon RLS
7. `lorry_receipts` + hub-scoped RLS + LR auto-numbering trigger
8. `lr_status_history` (append-only, no UPDATE/DELETE policies)
9. `to_pay_collections` + `proof_of_deliveries` + RLS

### Step 7: Generate TypeScript Types
```bash
supabase gen types typescript --local > src/types/supabase.ts
```

---

## 🔲 Phase 1 Build Queue (Post-Schema)

- [ ] Next.js project scaffold + dependencies installed
- [ ] Supabase local dev running
- [ ] Database schema + all RLS migrations written
- [ ] TypeScript types generated from schema
- [ ] Supabase Auth + JWT claims hook configured
- [ ] Next.js middleware (route protection) implemented
- [ ] Tenant registration page (fleet_owner sign-up)
- [ ] Login page (email/password + phone OTP)
- [ ] Fleet Owner dashboard (6 metric widgets)
- [ ] Hub management CRUD (fleet_owner only)
- [ ] Vehicle management CRUD (fleet_owner only)
- [ ] Driver registry CRUD (fleet_owner only)
- [ ] Trip schedule management (fleet_owner only)
- [ ] User management — invite Hub Managers (fleet_owner only)
- [ ] Customer public booking form (`/book/[tenant-slug]`)
- [ ] Hub Manager dashboard (Pending Requests widget + LR list)
- [ ] LR creation form (keyboard-first, auto-assigns to trip)
- [ ] LR listing page (filters: status, date, hub, search)
- [ ] LR detail + status transition actions
- [ ] LR thermal print (3-inch) + PDF download
- [ ] Delivery confirmation form (POD + To-Pay collection)
- [ ] Trip dispatch page

---

## Phase 2 Queue (v2 — Not Started)
- [ ] Flutter driver app
- [ ] Live GPS tracking dashboard
- [ ] WhatsApp notifications via WATI
- [ ] Customer public tracking page

---

## Key Decisions Log
| Decision | Choice | Reference |
|---|---|---|
| Trip model | 1 trip = many LRs | CONTEXT.md §7 |
| LR number format | `MUM-2025-000123` | CONTEXT.md §13 |
| Freight pricing v1 | Manual entry | CONTEXT.md §20 |
| Auth | Supabase JWT claims | CONTEXT.md §12 |
| Maps v1 | Google Maps | CONTEXT.md §3 |
| WhatsApp | WATI (v2) | CONTEXT.md §3 |
| Supabase region | Dev: us-east-1 / Prod: Mumbai | CONTEXT.md §3 |
| Theme | Light theme | CONTEXT.md §3 |
| Node version | v20 LTS | REQUIREMENTS.md |
| Next.js version | 14.2.x | REQUIREMENTS.md |

---

## How to Start a New Session

Paste this as your opening message in a new chat:

> "Read CONTEXT.md, AGENTS.md, and PROGRESS.md in the SmartParcel workspace at `/Users/nantha/Documents/Projects/SmartParcel`. Then continue Phase 1 development. Today's task: [describe what you want to build]."
