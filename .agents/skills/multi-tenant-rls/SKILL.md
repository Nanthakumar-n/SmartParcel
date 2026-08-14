---
name: multi-tenant-rls
description: Strict multi-tenant isolation rules using PostgreSQL RLS. Use when generating SQL schemas, migrations, API endpoints, or any Supabase backend function.
---
# Strict Multi-Tenant Isolation (PostgreSQL RLS)

## Core Rule
Every database query, migration, and table design **must** enforce PostgreSQL Row-Level Security (RLS). Policies must derive `tenant_id` from the authenticated user — never from a client-supplied parameter.

---

## ⚠️ Critical: auth.uid() ≠ tenant_id

`auth.uid()` returns the **logged-in user's UUID**, NOT the tenant's UUID.
Always resolve `tenant_id` via the `users` table:

```sql
-- ❌ WRONG — auth.uid() is the user ID, not tenant ID
USING (tenant_id = auth.uid())

-- ✅ CORRECT — resolve tenant_id from the users table
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
```

Use a helper function to avoid repeating this in every policy:

```sql
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$;
```

Then all policies use:
```sql
USING (tenant_id = current_tenant_id())
```

---

## Standard 4-Policy CRUD Pattern

Apply this to every tenant-scoped table:

```sql
-- 1. Enable RLS
ALTER TABLE lorry_receipts ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: tenant sees only their rows
CREATE POLICY "tenant_select" ON lorry_receipts
  FOR SELECT USING (tenant_id = current_tenant_id());

-- 3. INSERT: tenant can only insert their own rows
CREATE POLICY "tenant_insert" ON lorry_receipts
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- 4. UPDATE: tenant can only update their own rows
CREATE POLICY "tenant_update" ON lorry_receipts
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- 5. DELETE: tenant can only delete their own rows
CREATE POLICY "tenant_delete" ON lorry_receipts
  FOR DELETE USING (tenant_id = current_tenant_id());
```

---

## Role-Aware Policies (Hub Manager Scoping)

Hub Managers must be further scoped to their **assigned hub(s)** — not the entire tenant.
Use JWT claims to check role, then scope by hub assignment:

```sql
-- Helper: get the current user's role from JWT claims
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'user_role')::text
$$;

-- Helper: get hub IDs assigned to the current user
CREATE OR REPLACE FUNCTION current_user_hub_ids()
RETURNS uuid[]
LANGUAGE sql STABLE
AS $$
  SELECT ARRAY(SELECT hub_id FROM user_hub_assignments WHERE user_id = auth.uid())
$$;
```

### Hub-Scoped LR INSERT Policy (Hub Manager can only create LRs at their hub)
```sql
CREATE POLICY "hub_manager_insert_lr" ON lorry_receipts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR (
        current_user_role() = 'hub_manager'
        AND from_hub_id = ANY(current_user_hub_ids())
      )
    )
  );
```

### Hub-Scoped LR UPDATE Policy
```sql
CREATE POLICY "hub_manager_update_lr" ON lorry_receipts
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR (
        current_user_role() = 'hub_manager'
        AND from_hub_id = ANY(current_user_hub_ids())
      )
    )
  );
```

---

## Anonymous / Public RLS (Customer Booking Form)

The `booking_requests` table accepts submissions from unauthenticated customers.
Use the `anon` role with a tenant-slug lookup:

```sql
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated users to INSERT a booking request
-- (tenant resolved via tenant slug in URL, passed as a non-secret field)
CREATE POLICY "anon_insert_booking_request" ON booking_requests
  FOR INSERT TO anon
  WITH CHECK (
    tenant_id = (SELECT id FROM tenants WHERE slug = tenant_slug)
  );

-- Hub Managers and Fleet Owners can SELECT booking requests for their tenant
CREATE POLICY "tenant_select_booking_requests" ON booking_requests
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Hub Managers can UPDATE (accept/reject) booking requests at their hub
CREATE POLICY "hub_manager_update_booking_request" ON booking_requests
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'fleet_owner'
      OR current_user_role() = 'hub_manager'
    )
  );
```

---

## Audit Table RLS (lr_status_history)

The audit table is **append-only** — no UPDATE or DELETE allowed:

```sql
ALTER TABLE lr_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_history" ON lr_status_history
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_insert_history" ON lr_status_history
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- Explicitly NO update or delete policies — audit trail is immutable
```

---

## LR Auto-Numbering: Sequence + Trigger

```sql
-- Per-hub sequence table
CREATE TABLE lr_sequences (
  hub_id    uuid PRIMARY KEY REFERENCES hubs(id),
  year      integer NOT NULL,
  last_seq  integer NOT NULL DEFAULT 0,
  UNIQUE(hub_id, year)
);

-- Function to generate the next LR number
CREATE OR REPLACE FUNCTION generate_lr_number(p_hub_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hub_code text;
  v_year     integer := EXTRACT(YEAR FROM now())::integer;
  v_seq      integer;
BEGIN
  SELECT hub_code INTO v_hub_code FROM hubs WHERE id = p_hub_id;

  INSERT INTO lr_sequences (hub_id, year, last_seq)
  VALUES (p_hub_id, v_year, 1)
  ON CONFLICT (hub_id, year)
  DO UPDATE SET last_seq = lr_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_hub_code || '-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
END;
$$;

-- Trigger: auto-generate lr_number on INSERT
CREATE OR REPLACE FUNCTION set_lr_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.lr_number IS NULL THEN
    NEW.lr_number := generate_lr_number(NEW.from_hub_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_lr_number
  BEFORE INSERT ON lorry_receipts
  FOR EACH ROW EXECUTE FUNCTION set_lr_number();
```

---

## API Endpoints & Supabase Functions

- Never pass `tenant_id` as a client query parameter — always derive it server-side.
- Never use `service_role` key in client-side code.
- Never use `SET row_security = off` in any migration or function.
- All Supabase Edge Functions must use `createClient` with the user's JWT, not the service role.

---

## Verification Checklist

- [ ] `current_tenant_id()` helper function exists and is used in all policies.
- [ ] `ENABLE ROW LEVEL SECURITY` applied to every tenant-scoped table.
- [ ] All 4 CRUD policies exist per table.
- [ ] Hub-scoped INSERT and UPDATE policies exist for `lorry_receipts`.
- [ ] `booking_requests` has anon INSERT policy + tenant SELECT policy.
- [ ] `lr_status_history` has no UPDATE or DELETE policies.
- [ ] LR auto-numbering trigger is applied to `lorry_receipts`.
- [ ] No `auth.uid()` used directly as `tenant_id` comparison anywhere.
