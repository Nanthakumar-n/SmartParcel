---
name: rbac-auth
description: JWT claims-based RBAC setup, Next.js middleware route protection, and role checks for SmartParcel. Use when implementing authentication, protected routes, role guards, or user session handling.
---
# RBAC & Authentication

SmartParcel uses **Supabase custom JWT claims** for role enforcement.
The claim key is `user_role`. Values: `fleet_owner`, `hub_manager`, `driver`.

---

## 1. Setting JWT Claims on Login

Use a Postgres function triggered after user creation/login to inject `user_role` into the JWT:

```sql
-- Function called by Supabase Auth hook: "Custom Access Token"
CREATE OR REPLACE FUNCTION set_user_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
  v_tenant_id uuid;
BEGIN
  -- Look up the user's role and tenant from the users table
  SELECT user_role, tenant_id
  INTO v_role, v_tenant_id
  FROM users
  WHERE id = (event->>'userId')::uuid;

  -- Inject claims into the token
  RETURN jsonb_set(
    jsonb_set(event, '{claims,user_role}', to_jsonb(v_role)),
    '{claims,tenant_id}', to_jsonb(v_tenant_id::text)
  );
END;
$$;
```

> Register this function as a **Custom Access Token hook** in Supabase Dashboard → Auth → Hooks.

---

## 2. Reading Claims in Next.js

### Server-Side (Server Component or Server Action)
```typescript
// lib/auth/session.ts
import { createServerClient } from '@/lib/supabase/server';

export type UserRole = 'fleet_owner' | 'hub_manager' | 'driver';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export async function getSession(): Promise<UserSession | null> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role: user.app_metadata?.user_role as UserRole,
    tenantId: user.app_metadata?.tenant_id as string,
  };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<UserSession> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  if (!allowedRoles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}
```

---

## 3. Next.js Middleware — Route Protection

```typescript
// middleware.ts (at project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes accessible without login
const PUBLIC_ROUTES = ['/login', '/register', '/book'];

// Routes only for fleet_owner
const FLEET_OWNER_ONLY = [
  '/settings/users',
  '/settings/hubs',
  '/settings/vehicles',
  '/settings/trips',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set(name, value, options),
        remove: (name, options) => response.cookies.set(name, '', options),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = user.app_metadata?.user_role as string;

  // Drivers have no web admin access
  if (role === 'driver') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fleet-owner-only routes
  if (FLEET_OWNER_ONLY.some((r) => pathname.startsWith(r))) {
    if (role !== 'fleet_owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

---

## 4. Role Guard in Server Actions

Always check role at the start of every mutating Server Action:

```typescript
'use server';

import { requireRole } from '@/lib/auth/session';

export async function createHub(formData: FormData) {
  // Only fleet_owner can create hubs
  const session = await requireRole(['fleet_owner']);
  // session.tenantId is now available and trusted

  const supabase = createServerClient();
  const { error } = await supabase.from('hubs').insert({
    ...data,
    tenant_id: session.tenantId, // always set from server session
  });
}

export async function createLorryReceipt(formData: FormData) {
  // Both fleet_owner and hub_manager can create LRs
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  // ...
}
```

---

## 5. Role Guard in Server Components (Page-Level)

```typescript
// app/(dashboard)/settings/users/page.tsx
import { requireRole } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  try {
    const session = await requireRole(['fleet_owner']);
    // render page
  } catch {
    redirect('/dashboard');
  }
}
```

---

## 6. Client-Side Role Checks (UI Visibility)

Use a context provider to expose the session to Client Components:

```typescript
// components/providers/session-provider.tsx
'use client';

import { createContext, useContext } from 'react';
import type { UserSession } from '@/lib/auth/session';

const SessionContext = createContext<UserSession | null>(null);

export function useSession() {
  return useContext(SessionContext);
}

export function useIsFleetOwner() {
  const session = useSession();
  return session?.role === 'fleet_owner';
}

export function useIsHubManager() {
  const session = useSession();
  return session?.role === 'hub_manager';
}
```

Use in UI to conditionally render:
```tsx
// Show 'Manage Users' link only to fleet owners
{isFleetOwner && (
  <SidebarLink href="/settings/users">Manage Users</SidebarLink>
)}
```

> ⚠️ Client-side role checks are for **UI visibility only**. All security enforcement must happen in Server Actions and RLS policies — never rely on client-side checks alone.

---

## 7. Hub Manager Hub Assignment

A Hub Manager may be assigned to one or more hubs. Store this in `user_hub_assignments`:

```sql
CREATE TABLE user_hub_assignments (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hub_id   uuid NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  PRIMARY KEY (user_id, hub_id)
);
ALTER TABLE user_hub_assignments ENABLE ROW LEVEL SECURITY;
-- Standard tenant RLS policies apply
```

When a Hub Manager submits a form, verify their assigned hub matches the `from_hub_id` of the LR — both in the Server Action and via RLS.

---

## 8. Permission Reference Table

| Action | fleet_owner | hub_manager | driver |
|---|---|---|---|
| Register / manage tenant | ✅ | ❌ | ❌ |
| Invite users | ✅ | ❌ | ❌ |
| Manage hubs | ✅ | ❌ | ❌ |
| Manage vehicles | ✅ | ❌ | ❌ |
| Manage drivers | ✅ | ❌ | ❌ |
| Define trip schedules | ✅ | ❌ | ❌ |
| Create ad-hoc trip | ✅ | ✅ | ❌ |
| Create LR (own hub) | ✅ | ✅ | ❌ |
| Accept booking requests | ✅ | ✅ | ❌ |
| Cancel LR (pre-transit) | ✅ | ✅ (own hub) | ❌ |
| Cancel LR (in-transit+) | ✅ | ❌ | ❌ |
| Dispatch trip | ✅ | ✅ | ❌ |
| Confirm ARRIVED | ✅ | ✅ (dest hub) | ❌ |
| Mark DELIVERED + POD | ✅ | ✅ (dest hub) | ❌ |
| View Fleet Owner dashboard | ✅ | ❌ | ❌ |
| Access web admin | ✅ | ✅ | ❌ |
| Access Flutter driver app | ❌ | ❌ | ✅ (v2) |
