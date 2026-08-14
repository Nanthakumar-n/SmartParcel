# SmartParcel — Workspace Agent Rules

## Always Read First
Before starting any task, read `CONTEXT.md` in the workspace root. It is the single source of truth for all architecture, domain, and scope decisions.

---

## V1 MVP Scope Constraint
The Flutter mobile app, live tracking, public tracking page, WhatsApp notifications, and super-admin panel are **deferred to v2**. Do not generate code for these unless explicitly instructed.

---

## Mandatory Skills to Load

| Situation | Load Skill |
|---|---|
| Writing any SQL schema, migration, or Supabase function | `multi-tenant-rls` |
| Writing any form, input field, or validation logic | `india-domain-formatting` |
| Writing any Flutter code | `mobile-offline-first` |
| Writing or reviewing any Next.js / Supabase feature | `developer-standards` |
| Completing any frontend feature or dashboard page | `automated-ui-verification` |
| Verifying a completed task | `qa-verification` |
| Implementing auth, login, protected routes, or role checks | `rbac-auth` |
| Implementing any LR status change, dispatch, or delivery flow | `lr-state-machine` |
| Reviewing any generated code, file, or set of changes | `code-review` |

---

## Code Generation Rules

### TypeScript
- Never use `any`. Use explicit interfaces for all data shapes.
- All Supabase client calls must be typed using the generated `Database` types.
- Use `zod` for runtime validation of all form inputs and API payloads.

### Database / Supabase
- Every table must have `tenant_id UUID NOT NULL` with RLS enforced via `auth.uid()`.
- Roles are stored as Supabase custom JWT claims. Claim key: `user_role`. Values: `fleet_owner`, `hub_manager`, `driver`.
- Never use the `service_role` key in client-side code.
- LR numbers follow the format: `{HUB_CODE}-{YYYY}-{6-digit zero-padded sequence}` (e.g., `MUM-2025-000123`).

### Currency & Formatting
- Store all monetary amounts as **paise** (bigint integer, 1 INR = 100 paise).
- Display all currency using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Phone numbers: validate with `/^(\+91)?[6-9]\d{9}$/` and store in E.164 format (`+919876543210`).
- Vehicle numbers: validate with `/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/`, store uppercase.

### UI / Design
- Theme: **Light theme** throughout. No dark mode for v1.
- Use `shadcn/ui` components as the base. Extend with Tailwind CSS utility classes.
- Hub Manager forms must be **keyboard-first**: logical tab order, Enter to submit.
- All forms must show field-level validation errors using `react-hook-form` + `zod`.

---

## Environment Rules
- Dev Supabase: `us-east-1`
- Production Supabase: `ap-south-1` (Mumbai)
- Never hardcode environment variables. Always use `.env.local` (dev) and Vercel environment variables (prod).
- Use `NEXT_PUBLIC_` prefix only for values safe to expose to the browser.

---

## Environment & Version Rules (Never Violate)
- **Node.js**: Always use v20 LTS — never v22 or v23.
- **Next.js**: Always use `14.2.x` — never Next.js 15 (shadcn/ui + Supabase SSR not confirmed compatible).
- **Supabase client**: Always use `@supabase/ssr` — never the deprecated `@supabase/auth-helpers-nextjs`.
- **Tailwind CSS**: Always use v3.x — not v4 (shadcn/ui does not support v4 yet).
- **shadcn/ui**: Never install as a package. Use `npx shadcn@latest init` and `npx shadcn@latest add <component>`.
- **Supabase CLI**: Installed via Homebrew (`brew install supabase/tap/supabase`). Never via npm global.
- **Docker**: Must be running before any `supabase start` command.
- **Flutter / Android**: Do NOT generate Android/Java/Kotlin code in v1. Flutter is v2 scope only.
- See [REQUIREMENTS.md](../REQUIREMENTS.md) for full version table and installation scripts.

---

## Verification Before Marking Complete
Every completed task must pass the `automated-ui-verification` skill checklist:
1. Desktop screenshot at 1440×900.
2. Mobile screenshot at 375×812.
3. No horizontal scroll on mobile.
4. Form validation works for invalid Indian phone numbers and vehicle numbers.
5. RLS verified: no cross-tenant data visible.
