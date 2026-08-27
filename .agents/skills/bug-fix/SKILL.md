---
name: bug-fix
description: >
  Structured protocol for investigating and fixing bugs in SmartParcel.
  The agent reads project context and progress, strictly adheres to
  developer-standards, and follows a reproducible triage → diagnose →
  fix → verify loop before marking any bug resolved.
triggers:
  - "fix bug"
  - "debug"
  - "there is an issue with"
  - "something is broken"
  - "it doesn't work"
  - "bug fix"
---

# Bug Fix Protocol — SmartParcel

## Step 0 — Mandatory Pre-Flight (ALWAYS run first)

Before touching a single line of code, complete these three reads **in order**:

1. **Read `CONTEXT.md`** (workspace root)
   - Re-anchor: current phase, domain model, LR state machine, RBAC permission matrix, and tech stack.
   - Confirm which phase the broken feature belongs to (Phase 1 complete; Phase 1.5 in sprint).

2. **Read `PROGRESS.md`** (workspace root)
   - Confirm what was last built, any known workarounds already applied, and the Key Decisions Log.
   - Check if the bug area was flagged as a known issue or deferred decision.

3. **Load the `developer-standards` skill** (`.agents/skills/developer-standards/SKILL.md`)
   - All fixes **must** conform to: three-layer architecture, `ActionResult<T>` return type, no `any`, typed Supabase queries, `zod` validation, `shadcn/ui` components, Indian formatting conventions.
   - Any violation of developer-standards during a fix is itself a bug — do not introduce new ones.

> ⚠️ Do NOT skip Step 0. A fix that misunderstands the domain model or violates architecture standards will cause regressions.

---

## Step 1 — Understand & Reproduce the Bug

### 1a. Capture the full bug report
Gather (ask the user if any are missing):
- **What is the symptom?** (UI behavior, error message, wrong data, missing data)
- **Which page / route is affected?** (e.g., `/lorry-receipts`, `/trip-dispatches`)
- **Which user role sees this?** (`fleet_owner`, `hub_manager`)
- **Steps to reproduce** (exact sequence of actions)
- **Expected behavior vs. actual behavior**
- **Console / network errors** (browser DevTools or terminal output)

### 1b. Classify the bug
| Classification | Description | Examples |
|---|---|---|
| **UI / Rendering** | Component doesn't render or behaves incorrectly | Action button has no effect, UUID shown instead of label |
| **State Machine** | LR/Trip status transition is blocked or wrong | Trip won't start, LR stuck in wrong state |
| **RBAC / Permission** | Wrong role can or cannot perform an action | Hub Manager can't complete trip, Fleet Owner can't cancel |
| **Data / Query** | Incorrect or missing data returned | Bookings not appearing in trip manifest |
| **Validation** | Form rejects valid input or accepts invalid input | Indian phone number incorrectly rejected |
| **DB / RLS** | Data not saved, cross-tenant leak, or permission denied | Insert silently fails due to RLS policy |
| **Server Action** | Mutation fails, returns wrong `ActionResult`, or crashes | Action button fires but nothing happens |

### 1c. Locate the affected files
Use the three-layer map to find the right layer(s) to inspect:

```
Bug symptom               → Start investigating here
─────────────────────────────────────────────────────────────
Button click does nothing → actions.ts → (inspect ActionResult return)
Wrong data displayed      → page.tsx → lib/db/<domain>.ts
Validation error          → lib/validations/<domain>.ts
Transition blocked        → lib/services/lr-state-machine.ts
                            lib/services/delivery.ts
Permission denied (RBAC)  → lib/auth/session.ts → middleware.ts
RLS / DB error            → supabase/migrations/*.sql (RLS policies)
Trip manifest issue       → lib/db/trips.ts → actions.ts (loadLRAction)
```

> 💡 Run `grep -r "TODO\|FIXME\|HACK\|workaround" --include="*.ts" --include="*.tsx" .` to surface any known deferred issues near the bug area.

---

## Step 2 — Diagnose (Root Cause Analysis)

### 2a. Read the relevant files
- Read the **Server Action** first — check what it returns and whether it calls `revalidatePath`.
- Read the **Service layer** — check business logic, guards, and state machine enforcement.
- Read the **DB helper** — check for missing filters, wrong column selects, or absent `tenant_id` scoping.
- Read the **component** — check how `ActionResult` errors are surfaced (toast? `form.setError()`?).

### 2b. Check these common SmartParcel gotchas

| Gotcha | How to spot it |
|---|---|
| `SelectValue` lazy-mount (Radix UI) | Select shows raw UUID instead of label on first render |
| `tenant_id` missing in insert | RLS silently blocks the insert; no error shown to user |
| Missing `revalidatePath` after mutation | Stale data shown after save — page doesn't refresh |
| Sequential `await` instead of `Promise.all` | Slow page load; independent queries run one-by-one |
| Role guard missing in Server Action | `fleet_owner`-only action executable by `hub_manager` |
| LR transition not validated | State machine skipped; direct status update without audit trail entry |
| Amount not converted to paise | Monetary value stored/displayed as rupees instead of paise |
| Hub scope not enforced | Hub Manager can act on LRs belonging to other hubs |
| Trip dispatch without vehicle | Trip dispatched with `null` vehicle_id (driver is optional per lifecycle) |
| **`@base-ui-react` render prop** | Using `asChild` (Radix UI pattern) instead of `render={<Element>}` causes TS error `Property 'asChild' does not exist` — see rule below |

> ⚠️ **This project uses `@base-ui-react`, NOT Radix UI.** Confirm the import in any `components/ui/*.tsx` file before writing trigger/popover/dialog code. The API is:
> ```tsx
> // ✅ Correct — @base-ui-react pattern used in THIS project
> <DialogTrigger render={<Button>...</Button>} />
> <DropdownMenuTrigger render={<Button>...</Button>} />
>
> // ❌ Wrong — Radix UI pattern (asChild does not exist here)
> <DialogTrigger asChild><Button>...</Button></DialogTrigger>
> ```

### 2c. Document your findings
Before writing any code, write a one-paragraph root cause summary:
> *"The bug is in [file]. The root cause is [specific reason]. It affects [who] when [condition]. The fix is [approach]."*
- Show the findings to the user and get a confirmation before attempting to fix. 

---

## Step 3 — Fix (Implementation)

### 3a. Apply the fix in the correct layer

| Fix type | Correct layer | Do NOT fix in |
|---|---|---|
| Wrong data shown | `lib/db/<domain>.ts` | Component |
| Business rule violated | `lib/services/<domain>.ts` | DB helper or action |
| Form validation wrong | `lib/validations/<domain>.ts` | Component inline |
| Action silently fails | `app/(dashboard)/<feature>/actions.ts` | Component |
| RLS blocks valid insert | `supabase/migrations/` (new migration) | Application code |
| UI doesn't show error | `_components/<Component>.tsx` | Service layer |

### 3b. Standards checklist — verify BEFORE committing

- [ ] No `any` — use explicit types or `unknown` with guards
- [ ] Supabase queries typed — `Database['public']['Tables'][...]['Row']`
- [ ] `ActionResult<T>` returned from all Server Actions — never throw
- [ ] `tenant_id` present in every insert and filter
- [ ] LR state machine enforced — use `validateTransition()` from `lib/services/lr-state-machine.ts`
- [ ] Audit trail written — every LR status change writes to `lr_status_history`
- [ ] `revalidatePath` called after every mutation
- [ ] Paise used for all monetary storage; INR display via `Intl.NumberFormat('en-IN')`
- [ ] Indian phone / vehicle format validated with correct regexes
- [ ] Hub scope enforced — Hub Manager actions scoped to `getUserHubIds()`
- [ ] Role guard present — `requireRole([...])` at the top of every Server Action
- [ ] No `console.log` — use `Sentry.captureException()` for unexpected errors
- [ ] No magic strings — use constants from `lib/constants/`

### 3c. UI Component Pre-Flight (MANDATORY before writing/rewriting any `.tsx`)

Before writing or editing any UI component, complete these steps **in order**:

1. **Identify the UI library** — open the relevant `components/ui/*.tsx` file and read the import line.
   - `@base-ui-react` → use `render={<Element>}` trigger pattern
   - `@radix-ui` → use `asChild` trigger pattern
   - Never assume — always confirm.

2. **Read a working sibling component first** — before writing new component code, read at least one existing working component of the same type in the same feature area.
   - Writing a new table action menu? Read `vehicle-table.tsx` or `hub-table.tsx` first.
   - Writing a new dialog trigger? Read `vehicle-dialog.tsx` or `hub-dialog.tsx` first.
   - Writing a new manifest/sheet panel? Read the existing `manifest-panel.tsx` first.

3. **Prefer targeted edits over full rewrites** — if an existing file is broken, fix the specific broken lines. Only rewrite the full component if >70% of the logic is changing. A rewrite without reading the original first is always wrong.

4. **UI pattern anchor files** (always read one before writing any UI):
   | Pattern | Read this file first |
   |---|---|
   | Dropdown trigger | [`vehicle-table.tsx` L270–280](file:///Users/nantha/Documents/Projects/SmartParcel/app/(dashboard)/vehicles/_components/vehicle-table.tsx) |
   | Dialog trigger | [`vehicle-dialog.tsx` L128–140](file:///Users/nantha/Documents/Projects/SmartParcel/app/(dashboard)/vehicles/_components/vehicle-dialog.tsx) |
   | Sheet/side panel | [`manifest-panel.tsx`](file:///Users/nantha/Documents/Projects/SmartParcel/app/(dashboard)/trip-dispatches/_components/manifest-panel.tsx) |
   | Server Action pattern | [`actions.ts`](file:///Users/nantha/Documents/Projects/SmartParcel/app/(dashboard)/trip-dispatches/actions.ts) |

### 3d. Write a focused, minimal fix
- Fix **only** the root cause. Do not refactor unrelated code in the same PR.
- If the fix requires a new DB migration, assign it the next safe migration number (check via `supabase migration list`) and apply RLS immediately.
- If the fix touches the LR state machine, load the `lr-state-machine` skill first.
- If the fix touches RBAC or middleware, load the `rbac-auth` skill first.
- If the fix touches RLS policies, load the `multi-tenant-rls` skill first.

---

## Step 4 — Verify (Quality Gate)

### 4a. Run the build gates in order

```bash
# 1. Type check — must be 0 errors
npx tsc --noEmit

# 2. Lint — must be 0 warnings, 0 errors
npm run lint

# 3. Build — all routes must compile
npm run build
```

> ⛔ Do NOT mark a bug as fixed unless all three commands pass with 0 errors.
> A TypeScript or lint error introduced by the fix is itself a regression.

### 4b. Run the `automated-ui-verification` skill only after user approval

> ⚠️ **DO NOT run UI verification unless the user explicitly approves it.**

- Only after the user says "Run UI verification" or similar, then:
  - Navigate to the affected page using the browser sub-agent.
  - Reproduce the exact original steps-to-reproduce — confirm the bug is gone.
  - Capture a screenshot at 1440×900 (desktop) and 375×812 (mobile).
  - Verify no horizontal scroll introduced on mobile.

### 4c. Regression checks for the specific bug class

| Bug class | Additional regression check |
|---|---|
| State machine | Verify full LR lifecycle still works end-to-end |
| RBAC | Verify both `fleet_owner` and `hub_manager` see correct actions |
| DB / RLS | Verify no cross-tenant data visible (log in as two different tenants) |
| Validation | Verify valid Indian phone/vehicle formats still accepted |
| Trip manifest | Verify bookings with matching source→destination appear in new trips |
| Dispatch | Verify trip cannot be dispatched without vehicle AND driver assigned |

---

## Step 5 — Commit & Document

### 5a. Git commit — Conventional Commits format

```
fix(<scope>): <concise description of what was fixed>

Root cause: <one sentence>
Affected: <role(s) and page(s)>
```

Scopes for bug fixes: `lr`, `trips`, `dispatch`, `hubs`, `drivers`, `vehicles`, `auth`, `rls`, `dashboard`, `ui`, `expenses`, `whatsapp`

Example:
```
fix(dispatch): prevent trip dispatch without vehicle and driver assigned

Root cause: dispatchTripAction did not validate vehicle_id/driver_id presence before status update.
Affected: fleet_owner and hub_manager on /trip-dispatches page.
```

### 5b. Update `PROGRESS.md` (if significant)
If the fix resolves a known bug category or changes a Key Decision:
- Add it to the **Key Decisions Log** table if a design choice was made.
- Note it under the current session's completed items.

---

## Phase-Specific Bug Context

### Known Phase 1 Bug Areas (from `Phase 1 bugs.txt`)
| # | Bug | Area | Likely Layer |
|---|---|---|---|
| 1 | Action buttons in LR dashboard have no effect | `actions.ts` → component error handling | Server Action + UI |
| 2 | Bookings not available to assign to new trips | `lib/db/trips.ts` → `loadLRAction` filter | DB helper |
| 3 | Trip manifest blocks start even with one assigned booking | `dispatchTripAction` validation logic | Server Action / Service |
| 4 | Trip dispatches without vehicle assigned | `dispatchTripAction` pre-flight guard (driver is optional) | Server Action |
| 5 | Hub Manager cannot complete a trip (only Fleet Owner can) | RBAC guard in trip transition actions | Server Action + `requireRole` |

### Phase 1.5 In-Sprint — Do Not Break
- `trip_expenses` and `trip_expense_settlements` tables (Phase 1.5 DB)
- `/settings` route (WATI config)
- `whatsapp-notify` and `payment-reminder` Edge Functions
- All existing Phase 1 features — any regression blocks the sprint

### Out of Scope (Do Not Touch)
- Flutter / Android code
- Phase 2a live GPS tracking
- Phase 2b financial reports
- Phase 3 super-admin, SaaS billing, E-Way Bill

---

## Quick Reference — Key Files

| File | Purpose |
|---|---|
| `lib/services/lr-state-machine.ts` | `VALID_TRANSITIONS`, `validateTransition()` |
| `lib/auth/session.ts` | `requireRole()`, `getUserHubIds()` |
| `middleware.ts` | Route-level role enforcement |
| `lib/db/trips.ts` | Trip manifest queries |
| `app/(dashboard)/trip-dispatches/actions.ts` | `dispatchTripAction`, `loadLRAction` |
| `app/(dashboard)/lorry-receipts/actions.ts` | LR mutations and status transitions |
| `lib/utils/format-currency.ts` | `formatINR()`, `paiseToCurrency()` |
| `lib/constants/lr-statuses.ts` | LR status constants |
| `supabase/migrations/` | RLS policies and schema |
