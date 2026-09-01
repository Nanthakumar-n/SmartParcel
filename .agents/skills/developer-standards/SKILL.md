---
name: developer-standards
description: Best practices and conventions for writing Next.js, Supabase RLS, and Flutter code for SmartParcel. Use when generating, reviewing, or editing codebase features.
---
# Developer Standards

## 1. TypeScript Rules
- **Never use `any`**. Use explicit interfaces or `unknown` with type guards.
- All Supabase client calls must be typed using the generated `Database` types from `@/types/supabase`.
- Use `zod` for runtime validation of all form inputs and API payloads.
- Export named types, not inline types, for all domain objects.
- Use string union types for enums (`LRStatus`, `PaymentMode`) — not raw strings scattered through code.

```typescript
// ✅ Correct
interface LorryReceipt {
  id: string;
  lr_number: string;
  status: LRStatus;
  freight_amount: number; // stored in paise
  tenant_id: string;
}

type LRStatus =
  | 'BOOKING_PENDING' | 'BOOKED' | 'PICKED_UP' | 'IN_TRANSIT'
  | 'ARRIVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
```

---

## 2. Project Architecture & Folder Structure

**Rule: Group by feature, not by type.** Each feature route is self-contained.

See `examples/folder-structure.md` for the full canonical tree. Key directories:

```
app/(dashboard)/<feature>/
  page.tsx            ← Server Component (data fetching)
  loading.tsx         ← Skeleton loader (REQUIRED per feature)
  actions.ts          ← Server Actions for this feature
  _components/        ← Feature-scoped components only
lib/
  services/           ← Business logic per domain (Layer 2)
  db/                 ← Typed Supabase queries (Layer 3)
  validations/        ← Zod schemas per domain
  utils/              ← Pure utility functions
  types/              ← Shared TypeScript types (incl. ActionResult)
  constants/          ← App-wide constants (statuses, modes)
  hooks/              ← Shared React hooks
components/
  ui/                 ← shadcn/ui (auto-generated, don't edit)
  shared/             ← Reusable app-level components (used by 2+ features)
```

**Rules:**
- Feature-local components go in `_components/`. The `_` prefix tells Next.js to ignore them as routes.
- Components used by 2+ features go in `components/shared/`.
- Never put business logic in components — only rendering and event delegation.
- Do NOT use barrel `index.ts` files — they cause circular deps and hurt tree-shaking.

---

## 3. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Server Actions | `verbNoun` | `createLorryReceipt`, `markDelivered` |
| Service functions | `verbNoun` | `processDelivery`, `dispatchTrip` |
| DB helpers | `verb` + domain | `getLRsByHub`, `insertLR`, `updateLRStatus` |
| Zod schemas | `domainActionSchema` | `lrCreateSchema`, `hubUpdateSchema` |
| Types/Interfaces | PascalCase | `LorryReceipt`, `ActionResult<T>` |
| Components | PascalCase = filename | `LRCreateForm` in `lr-create-form.tsx` |
| All files | kebab-case | `format-currency.ts`, `lr-create-form.tsx` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `LR_STATUSES` |

---

## 4. Service Layer & Separation of Concerns

**Three-layer architecture** (Server Action → Service → DB Helper):

| Layer | Location | Responsibility |
|---|---|---|
| **Server Action** | `app/<feature>/actions.ts` | Parse input (zod), call service, return `ActionResult<T>` |
| **Service** | `lib/services/<domain>.ts` | Business logic, validation, orchestration |
| **DB Helper** | `lib/db/<domain>.ts` | Typed Supabase queries — no business logic |

**Rules:**
- Server Actions must NOT contain business logic beyond input validation.
- Service functions receive a typed Supabase client — they don't create their own.
- DB helpers are pure query functions — no authorization, no business rules.
- Never call `supabase.from()` directly in components or Server Actions — go through `lib/db/`.

See `examples/server-action.ts`, `examples/service-layer.ts`, `examples/db-helper.ts` for reference implementations.

---

## 5. Standardized Action Return Type

Every Server Action **must** return `ActionResult<T>`:

```typescript
// lib/types/action-result.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };
```

**Rules:**
- Success branch carries typed data (e.g., `ActionResult<{ id: string }>` for create actions).
- Error branch uses field names as keys. `_form` for form-level (non-field) errors.
- Never throw from Server Actions — always return an `ActionResult`.
- Connect errors to `sonner` toasts and `form.setError()` on the client.

See `examples/action-result.ts` for helper functions and client-side usage patterns.

---

## 6. Next.js App Router Conventions

### Server vs Client Components
- Default to **Server Components** (no `'use client'` directive).
- Add `'use client'` only for: browser APIs, `useState`, `useEffect`, event handlers.
- Never fetch data in Client Components — fetch in Server Components, pass props down.

### Loading & Error States
- Every feature route under `(dashboard)/` **must** have a `loading.tsx` with skeleton UI.
- A root `error.tsx` at `app/(dashboard)/error.tsx` catches unexpected errors.
- Use `not-found.tsx` for detail pages (`[id]/page.tsx`) with invalid IDs.

### Data Fetching
- Fetch data in Server Components using `lib/db/` helpers.
- Use `Promise.all()` for independent parallel queries — never sequential `await`s for unrelated data.
- Use `{ count: 'exact' }` in list queries for pagination metadata.

```typescript
// ✅ Parallel fetching
const [lrData, hubData] = await Promise.all([
  getLRsByHub(supabase, hubId, { page, pageSize }),
  getHubById(supabase, hubId),
]);
```

### Server Actions vs API Routes
- **Server Actions**: All form submissions and mutations (create, update, delete).
- **API Routes** (`app/api/`): Only for webhooks, third-party callbacks, cron endpoints.

---

## 7. Supabase Client Setup

### Server-Side (Server Components, Server Actions, Route Handlers)
```typescript
// lib/supabase/server.ts
import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export function createServerClient() {
  const cookieStore = cookies();
  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.delete({ name, ...options }),
      },
    }
  );
}
```

### Client-Side (Client Components only)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 8. Database Query Patterns

### Select Only Needed Columns (Named Column Constants)
Never use `.select('*')` or bare `.select()` on mutations. Always define explicit column string constants at the top of each `lib/db/<domain>.ts` file:
```typescript
// ✅ Accept — explicit named column projection
export const LORRY_RECEIPT_COLUMNS = `
  id,
  lr_number,
  status,
  freight_amount,
  from_hub:hubs!from_hub_id(name),
  to_hub:hubs!to_hub_id(name)
`;

export async function getLRById(supabase: AnySupabaseClient, id: string) {
  return await supabase
    .from('lorry_receipts')
    .select(LORRY_RECEIPT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
}
```

### Pagination
Offset-based with `.range()`. Default page size: **25**.
```typescript
const { data, count } = await supabase
  .from('lorry_receipts')
  .select('id, lr_number, status', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### Transactions & Atomicity
Use `supabase.rpc()` for multi-step atomic operations (e.g., trip dispatch). Define logic in a Postgres function.

See `examples/db-helper.ts` for full query patterns including dynamic filters and search.

---

## 9. Form Validation: react-hook-form + zod

All forms use `react-hook-form` with `zodResolver`. Never validate manually.

```typescript
// lib/validations/lr.ts
export const lrCreateSchema = z.object({
  from_hub_id: z.string().uuid('Select an origin hub'),
  consignor_phone: z.string().regex(INDIA_PHONE_REGEX, 'Enter a valid Indian mobile number'),
  // ✅ Correct pattern for monetary inputs — string-parsed, converts to paise:
  freight_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 500 or 500.50)')
    .transform(v => Math.round(parseFloat(v) * 100)) // stores in paise
    .refine(v => v >= 1, 'Amount must be at least ₹0.01'),
  // ... see india-domain-formatting skill for all validation patterns
});
export type LRCreateInput = z.infer<typeof lrCreateSchema>;
```

```typescript
// In a Client Component
const form = useForm<LRCreateInput>({
  resolver: zodResolver(lrCreateSchema),
  defaultValues: { payment_mode: 'PAID' },
});
```

---

## 10. shadcn/ui Component Conventions

- Always use shadcn/ui components — never raw HTML inputs/buttons for UI.
- Use `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` for all form fields.
- Use `toast` from `sonner` for success/error notifications — connect to `ActionResult` errors.
- Extend with Tailwind utility classes. Never override shadcn component internals.

### Form Provider Context Boundary Invariant
- **Never place `<FormField>` outside `<Form {...form}>`**.
- If a form includes a top ribbon, master toggle switch, or multi-section header that binds to form state, `<Form {...form}><form ...>` must wrap the entire component tree from the very top.
- Failure to do this causes a runtime crash: `Cannot destructure property 'getFieldState' of '...useFormContext()'`.

```typescript
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
    {/* ✅ Top ribbon switch is safely inside Form context */}
    <div className="p-4 bg-emerald-50 rounded-xl">
      <FormField
        control={form.control}
        name="whatsapp_enabled"
        render={({ field }) => (
          <FormItem>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )}
      />
    </div>
    {/* Remaining fields */}
  </form>
</Form>
```

---

## 11. Layout & Enterprise Workspace Design (Workbook Sheet Pattern)

- **Full-Width Canvas Utilization**: Avoid squished side-by-side card wrappers that consume only 20% width and leave dead margins.
- **Excel-Style Workbook Sheet Tabs**: Use horizontal sheet tabs (`Company Profile`, `Waybill Defaults`, `WhatsApp Gateway`, `Audit Logs`) with icon badges and active tab indicator strips.
- **Multi-Column Responsive Sections**: Structure long forms into clear 2-column or 3-column enterprise grid rows with contextual subtitles.
- **Live Simulator Panels**: Pair configuration inputs with real-time visual output mocks (e.g. 3-inch thermal waybill simulator).

---

## 12. Keyboard-First Forms (Hub Manager UX)

- Logical `tabIndex` order matching the visual layout.
- All dropdowns keyboard-navigable (use shadcn `Select`, not native `<select>`).
- Primary submit button responds to `Enter` key.
- After successful LR creation, focus returns to the first field (rapid back-to-back entry).
- Submit buttons disabled while `form.formState.isSubmitting`.

---

## 12. Function Complexity & Readability

- **50-line soft limit** — Extract named helper functions if a function exceeds ~50 lines.
- **Early returns** — Use guard clauses for error cases. Avoid deeply nested `if/else`:
  ```typescript
  if (!parsed.success) return actionError('_form', 'Invalid input');
  if (!session) return formError('Unauthorized');
  // ... happy path continues flat
  ```
- **Single responsibility** — Each file does one thing. Don't mix unrelated Server Actions.
- **No `console.log`** in production — use Sentry for error tracking.
- **No magic strings** — Use constants from `lib/constants/` for statuses, payment modes, etc.

---

## 13. Error Handling & Observability

### Error Classification
| Type | Action | Sentry? |
|---|---|---|
| Validation error | Return field-level `ActionResult` error | No |
| Business error (e.g., invalid LR transition) | Return `_form` error in `ActionResult` | Warning |
| System error (DB down, unexpected) | Catch → `Sentry.captureException()` → generic `formError()` | Yes |

### Server Action Pattern
```typescript
'use server';
export async function createLR(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(['fleet_owner', 'hub_manager']);
    const parsed = lrCreateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
    const result = await createLRService(supabase, { ...parsed.data, ...session });
    if (!result.success) return result;
    revalidatePath('/lorry-receipts');
    return result;
  } catch (err) {
    Sentry.captureException(err);
    return formError('An unexpected error occurred. Please try again.');
  }
}
```

### Sentry Config
```typescript
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.2 });
```

---

## 14. Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only — never in client code
SENTRY_DSN=https://xxx@sentry.io/xxx

# Phase 1.5 — WhatsApp / WATI (server-only, never NEXT_PUBLIC_)
WATI_API_ENDPOINT=https://live-XXX.wati.io
WATI_API_TOKEN=eyJ...
```

- `NEXT_PUBLIC_` prefix **only** for browser-safe values.
- `SUPABASE_SERVICE_ROLE_KEY`, `WATI_API_TOKEN` — **never** in client code or Server Actions.
- Never hardcode env values in source code.
- Inside **Supabase Edge Functions** (Deno runtime), read env vars with `Deno.env.get()` — **not** `process.env`. See §18.

---

## 15. Git Conventions

### Commit Messages — Conventional Commits
Format: `type(scope): description`

| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `chore` | Dependencies, config, tooling |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `test` | Adding or updating tests |

**Scopes:**

| Scope | Use for |
|---|---|
| `lr` | Lorry receipt features |
| `hubs` | Hub / branch management |
| `trips` | Trip scheduling and dispatch |
| `expenses` | Trip expense ledger (Phase 1.5) |
| `whatsapp` | WATI notifications and Edge Functions (Phase 1.5) |
| `settings` | Tenant settings page (Phase 1.5) |
| `rls` | Row-Level Security policies and migrations |
| `auth` | Authentication, RBAC, session |
| `ui` | Shared components, design system |
| `deps` | Dependency updates |
| `dashboard` | Fleet Owner / Hub Manager dashboard |

Example: `feat(expenses): add trip expense ledger with void-entry pattern`

### Branch Naming
Format: `type/short-description` — e.g., `feat/trip-expenses`, `fix/rls-hub-policy`

---

## 16. Testing Strategy

> Testing is **deferred until post-Phase 1.5**. Phase 1 and 1.5 use `automated-ui-verification` as the primary QA gate.

- **Framework:** Vitest
- **First targets (Phase 1.5 onwards):** `lib/services/trip-expense.ts` (financial balance calculations) and `lib/validations/trip-expense.ts` (amount parsing, MISC description guard) — these involve money and should be unit-tested.
- **What to test:** Zod schemas, service functions, utility functions
- **What NOT to test:** UI components — use `automated-ui-verification` skill instead
- **Test location:** Colocated `__tests__/` directories next to the code they test
- **Mocking:** Mock `createServerClient()` for service layer tests

---

## 17. Flutter Mobile Guidelines (Phase 2a)

- Feature-first layout: `lib/features/<feature_name>/`.
- Use Riverpod for all state management.
- Offline-first: save to Hive before calling Supabase.
- See `mobile-offline-first` skill for detailed patterns.

---

## 18. Supabase Edge Functions (Phase 1.5+)

Edge Functions run on the **Deno runtime** — not Node.js. Key differences from Server Actions and API Routes:

### When to Use What

| Mechanism | Use When |
|---|---|
| **Server Action** | Form mutations, user-initiated operations |
| **API Route** (`app/api/`) | Third-party webhooks, OAuth callbacks |
| **Edge Function** | DB-triggered events, scheduled cron jobs, heavy async work that should run close to the DB |

### Environment Variables in Edge Functions

```typescript
// ✅ Correct — Deno runtime
const watiToken = Deno.env.get('WATI_API_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ❌ Wrong — process.env does not exist in Deno
const watiToken = process.env.WATI_API_TOKEN;
```

### Supabase Client Inside Edge Functions

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use service role key — Edge Functions run server-side, bypass RLS intentionally
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
```

### Folder Location

```
supabase/
  functions/
    whatsapp-notify/
      index.ts    ← DB webhook triggered (LR status changes)
    payment-reminder/
      index.ts    ← pg_cron scheduled (daily 10:00 AM IST)
```

### Rules
- Edge Functions are deployed via `supabase functions deploy <name>` — not part of the Next.js build.
- Set function env vars via `supabase secrets set KEY=value` (not `.env.local`).
- Always handle errors and write to `whatsapp_notifications_log` — Edge Functions have no automatic retry on 5xx.
- Use the idempotency pattern (`UNIQUE(lr_id, event_type, reminder_sequence)`) to guard against duplicate webhook deliveries.
