---
name: code-review
description: SmartParcel-specific code review checklist covering TypeScript quality, security, RLS correctness, LR state machine enforcement, RBAC, Indian domain formatting, UI conventions, and performance. Use when generating any code, reviewing a file, or before marking a task complete.
---
# Code Review Checklist

Run this checklist on every file touched before marking a task complete. A task is **not done** until it passes all applicable sections.

---

## 1. TypeScript Quality

- [ ] No `any` used anywhere. Use explicit interfaces or `unknown` with type guards.
- [ ] All Supabase query results are typed using the generated `Database` types from `@/types/supabase`.
- [ ] All domain objects have named, exported interfaces (not inline types).
- [ ] All enums (e.g. `LRStatus`, `PaymentMode`) are string union types — not raw strings scattered through code.
- [ ] No `@ts-ignore` or `@ts-expect-error` without an explanatory comment.
- [ ] Zod schemas exist for all form inputs and API payloads.
- [ ] No implicit `undefined` — all optional fields are explicitly typed as `field?: Type`.

```typescript
// ❌ Reject
const data: any = await supabase.from('lorry_receipts').select('*');

// ✅ Accept
const { data }: { data: LorryReceipt[] | null } = await supabase
  .from('lorry_receipts')
  .select('*');
```

---

## 2. Security — Critical

- [ ] **No `SUPABASE_SERVICE_ROLE_KEY` used in client-side code or Server Actions exposed to browser.**
- [ ] **No `tenant_id` passed as a client query parameter** — always derived server-side from session.
- [ ] **No `SET row_security = off`** anywhere in SQL or migrations.
- [ ] **No hardcoded secrets, API keys, or credentials** in source files.
- [ ] Environment variables follow the naming convention:
  - `NEXT_PUBLIC_` only for values safe to expose to the browser.
  - Server-only vars (e.g. `SENTRY_AUTH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) have no `NEXT_PUBLIC_` prefix.
- [ ] All `auth.uid()` references in RLS policies are wrapped in `current_tenant_id()` — never used directly as a tenant comparator.

```sql
-- ❌ Reject
USING (tenant_id = auth.uid())

-- ✅ Accept
USING (tenant_id = current_tenant_id())
```

---

## 3. RLS & Database Correctness

- [ ] Every new table has `tenant_id UUID NOT NULL` column.
- [ ] Every new table has `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`.
- [ ] All 4 CRUD policies (SELECT / INSERT / UPDATE / DELETE) exist on every table.
- [ ] Tables that should be append-only (e.g. `lr_status_history`, `proof_of_deliveries`) have **no UPDATE or DELETE policies**.
- [ ] `booking_requests` table has an `anon` INSERT policy for unauthenticated customer submissions.
- [ ] Hub-scoped tables (`lorry_receipts`) have INSERT/UPDATE policies that check `from_hub_id = ANY(current_user_hub_ids())` for hub_manager role.
- [ ] LR auto-numbering trigger exists and fires on INSERT into `lorry_receipts`.
- [ ] No raw SQL skips RLS via `security definer` functions without explicit justification.

---

## 4. RBAC & Role Enforcement

- [ ] Every mutating Server Action calls `requireRole([...allowedRoles])` as the **first line**.
- [ ] Role checks use server-side session data — never trust client-supplied role values.
- [ ] Fleet-owner-only actions (hub creation, user management, vehicle management) reject `hub_manager` role explicitly.
- [ ] Hub Manager actions validate that the target `from_hub_id` matches the user's assigned hub(s).
- [ ] Client-side role checks (show/hide UI elements) are used only for UX — never as the sole security gate.
- [ ] Middleware route protection is in place for all `(dashboard)` routes.

```typescript
// ❌ Reject — no role check
export async function createHub(formData: FormData) {
  const supabase = createServerClient();
  await supabase.from('hubs').insert({...});
}

// ✅ Accept
export async function createHub(formData: FormData) {
  const session = await requireRole(['fleet_owner']); // first line
  const supabase = createServerClient();
  await supabase.from('hubs').insert({ ...data, tenant_id: session.tenantId });
}
```

---

## 5. LR State Machine

- [ ] Every LR status update calls `validateTransition()` before writing to the database.
- [ ] Every successful transition immediately writes a row to `lr_status_history`.
- [ ] `DELIVERED` and `CANCELLED` are treated as terminal — no code path allows transitions out of them.
- [ ] Trip dispatch transitions all LRs atomically — no partial batch updates.
- [ ] `markDelivered` always creates both a `proof_of_deliveries` row and (if `TO_PAY`) a `to_pay_collections` row.
- [ ] No status string literals in business logic — always use the `LRStatus` type.

```typescript
// ❌ Reject — raw string comparison, no validation
await supabase.from('lorry_receipts').update({ status: 'DELIVERED' }).eq('id', lrId);

// ✅ Accept
const result = validateTransition(lr.status, 'DELIVERED', ctx);
if (!result.valid) return { error: result.reason };
// ... update + write audit trail
```

---

## 6. India Domain Formatting

- [ ] All phone number inputs validated with `/^(\+91)?[6-9]\d{9}$/`.
- [ ] Phone numbers stored in E.164 format (`+919876543210`), never raw 10-digit.
- [ ] All vehicle number inputs validated with `/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/`, stored uppercase.
- [ ] All GSTIN inputs validated with the 15-character alphanumeric regex (if provided).
- [ ] All monetary amounts stored as `bigint` in **paise** — no floats for money.
- [ ] All monetary amounts displayed using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` — never `en-US` locale.
- [ ] No `parseFloat` or `toFixed` used for money calculations — always integer arithmetic in paise.

```typescript
// ❌ Reject
const display = `₹${(amount / 100).toFixed(2)}`; // float error risk

// ✅ Accept
const display = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR'
}).format(amount / 100);
```

---

## 7. Next.js & React Conventions

- [ ] Default to Server Components — `'use client'` only added when browser APIs / state / events are needed.
- [ ] Data fetching happens in Server Components — not in `useEffect` inside Client Components.
- [ ] Independent queries use `Promise.all()` for parallel fetching — no sequential `await`s for unrelated data.
- [ ] Mutations use Server Actions — not client-side `fetch()` calls to `/api/` routes for simple CRUD.
- [ ] API routes (`app/api/`) used only for webhooks, third-party callbacks, and cron endpoints.
- [ ] `revalidatePath()` or `revalidateTag()` called after every successful mutation.
- [ ] All Server Actions return `ActionResult<T>` — never throw or return ad-hoc shapes.
- [ ] Error boundary or try/catch wraps all Server Action logic with Sentry reporting.
- [ ] `ActionResult` errors connected to `sonner` toasts and `form.setError()` on the client.
- [ ] Every feature route has a `loading.tsx` with skeleton UI.
- [ ] Detail pages (`[id]/page.tsx`) have `not-found.tsx` for invalid IDs.
- [ ] No `console.log` left in production code — use Sentry for error tracking.

---

## 8. Forms & UI

- [ ] All forms use `react-hook-form` with `zodResolver` — no manual `useState` for form fields.
- [ ] All form fields use shadcn/ui `FormField / FormItem / FormLabel / FormControl / FormMessage` pattern.
- [ ] `<FormMessage />` is present for every field — field-level errors must be visible.
- [ ] Primary submit buttons are disabled while the form is submitting (`form.formState.isSubmitting`).
- [ ] Tab order is logical top-to-bottom, left-to-right for keyboard-first Hub Manager UX.
- [ ] No raw `<input>`, `<button>`, `<select>` HTML elements — always use shadcn/ui equivalents.
- [ ] Monetary inputs accept rupees from the user (UI layer), convert to paise before storing.

---

## 9. Performance & Query Patterns

- [ ] No N+1 query patterns — use Supabase joins (`.select('id, name, from_hub:hubs!from_hub_id(name)')`) instead of looping queries.
- [ ] **No `.select('*')`** — always specify needed columns explicitly.
- [ ] Large lists use offset-based pagination with `.range()` — default page size 25.
- [ ] List queries use `{ count: 'exact' }` for pagination metadata.
- [ ] Dynamic filters built using conditional `.eq()` / `.gte()` / `.or()` chains — see `examples/db-helper.ts`.
- [ ] Multi-step atomic operations use `supabase.rpc()` with Postgres functions.
- [ ] Supabase Realtime subscriptions are cleaned up on component unmount (`return () => subscription.unsubscribe()`).
- [ ] Images use `next/image` — never raw `<img>` tags.
- [ ] Heavy computations (e.g. PDF generation) happen in Server Actions or Edge Functions, not on the client.

---

## 10. File & Code Organisation

- [ ] New pages follow the App Router file convention: `app/(dashboard)/<feature>/page.tsx`.
- [ ] Server Actions are in `app/<feature>/actions.ts` — not inline in page files.
- [ ] **3-layer pattern enforced**: Server Action → `lib/services/` → `lib/db/`. No skipping layers.
- [ ] Business logic is in `lib/services/<domain>.ts` — NOT in Server Actions or components.
- [ ] Supabase query helpers are in `lib/db/<domain>.ts` — no `.from()` calls outside `lib/db/`.
- [ ] Zod schemas are in `lib/validations/<domain>.ts`.
- [ ] Feature-scoped components are in `app/<feature>/_components/` — not in `components/shared/`.
- [ ] Shared components (used by 2+ features) are in `components/shared/`.
- [ ] No barrel `index.ts` files — they cause circular deps and hurt tree-shaking.
- [ ] No business logic inside React components — components only render and delegate.
- [ ] Each Server Action file contains only actions for its feature — don't mix domains.

---

## 11. Naming Conventions

- [ ] Server Actions: `verbNoun` — `createLorryReceipt`, `markDelivered`.
- [ ] Service functions: `verbNoun` — `processDelivery`, `dispatchTrip`.
- [ ] DB helpers: `verb` + domain — `getLRsByHub`, `insertLR`, `updateLRStatus`.
- [ ] Zod schemas: `domainActionSchema` — `lrCreateSchema`, `hubUpdateSchema`.
- [ ] Components: PascalCase matching filename — `LRCreateForm` in `lr-create-form.tsx`.
- [ ] All files: kebab-case — `format-currency.ts`, `lr-create-form.tsx`.
- [ ] Constants: UPPER_SNAKE_CASE — `DEFAULT_PAGE_SIZE`, `LR_STATUSES`.

---

## 12. Function Complexity & Readability

- [ ] Functions stay under **~50 lines** — extract named helpers if longer.
- [ ] Guard clauses (early returns) used for error cases — no deep nesting.
- [ ] No magic strings — statuses, payment modes, etc. come from `lib/constants/`.
- [ ] Single responsibility — each file does one thing.

---

## 13. Git Conventions

- [ ] Commit messages follow Conventional Commits: `type(scope): description`.
- [ ] Valid types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`.
- [ ] Valid scopes: `lr`, `hubs`, `trips`, `rls`, `auth`, `ui`, `deps`, `dashboard`.
- [ ] Branch names follow `type/short-description` (e.g., `feat/lr-creation`).

---

## 14. Migration & Schema Files

- [ ] Migration file name follows the convention: `YYYYMMDDHHMMSS_descriptive_name.sql`.
- [ ] Every migration is idempotent — uses `CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`, etc.
- [ ] New tables always follow the section order: CREATE TABLE → ENABLE RLS → CREATE POLICIES → CREATE INDEXES → TRIGGERS.
- [ ] Foreign keys have `ON DELETE CASCADE` or `ON DELETE RESTRICT` explicitly set — no silent orphans.
- [ ] Indexes exist on all foreign key columns and frequently filtered columns (e.g. `tenant_id`, `status`, `from_hub_id`).

---

## Review Sign-Off Gate

A piece of code is approved only when:

| # | Check | Result |
|---|---|---|
| 1 | No `any` types | ☐ Pass / ☐ Fail |
| 2 | No hardcoded secrets | ☐ Pass / ☐ Fail |
| 3 | `requireRole()` called in all Server Actions | ☐ Pass / ☐ Fail |
| 4 | `tenant_id` derived server-side only | ☐ Pass / ☐ Fail |
| 5 | RLS policies correct on all new tables | ☐ Pass / ☐ Fail |
| 6 | LR transitions validated + audit trail written | ☐ Pass / ☐ Fail |
| 7 | Indian formats used (phone / vehicle / paise) | ☐ Pass / ☐ Fail |
| 8 | `revalidatePath()` called after mutations | ☐ Pass / ☐ Fail |
| 9 | No N+1 queries, no `.select('*')` | ☐ Pass / ☐ Fail |
| 10 | 3-layer pattern: Action → Service → DB | ☐ Pass / ☐ Fail |
| 11 | `ActionResult<T>` returned from all Server Actions | ☐ Pass / ☐ Fail |
| 12 | Naming conventions followed | ☐ Pass / ☐ Fail |
| 13 | `loading.tsx` present for feature routes | ☐ Pass / ☐ Fail |
| 14 | Functions under ~50 lines, early returns used | ☐ Pass / ☐ Fail |
| 15 | Conventional Commits format used | ☐ Pass / ☐ Fail |
| 16 | `qa-verification` checklist passed | ☐ Pass / ☐ Fail |
