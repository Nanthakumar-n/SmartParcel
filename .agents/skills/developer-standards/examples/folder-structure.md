# SmartParcel — Canonical Folder Structure

> This is the reference folder layout for the SmartParcel v1 web admin.
> Every new feature must follow this structure.

```
smartparcel/
├── app/
│   ├── (auth)/                          ← Auth pages (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                     ← Protected routes (sidebar + auth)
│   │   ├── layout.tsx                   ← Sidebar, top nav, auth check
│   │   ├── error.tsx                    ← Root error boundary for all dashboard
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 ← Fleet Owner dashboard (Server Component)
│   │   │   └── loading.tsx              ← Skeleton loader (REQUIRED)
│   │   │
│   │   ├── lorry-receipts/
│   │   │   ├── page.tsx                 ← LR listing with filters
│   │   │   ├── loading.tsx              ← Skeleton (REQUIRED)
│   │   │   ├── actions.ts              ← Server Actions for LR feature
│   │   │   ├── new/
│   │   │   │   └── page.tsx             ← LR creation form
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx             ← LR detail + status actions
│   │   │   │   └── not-found.tsx        ← Invalid LR ID handler
│   │   │   └── _components/             ← Feature-scoped components
│   │   │       ├── lr-create-form.tsx
│   │   │       ├── lr-detail-card.tsx
│   │   │       ├── lr-status-badge.tsx
│   │   │       ├── lr-filters.tsx
│   │   │       └── lr-table.tsx
│   │   │
│   │   ├── hubs/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── actions.ts
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── _components/
│   │   │       ├── hub-form.tsx
│   │   │       └── hub-table.tsx
│   │   │
│   │   ├── vehicles/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── actions.ts
│   │   │   └── _components/
│   │   │
│   │   ├── drivers/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── actions.ts
│   │   │   └── _components/
│   │   │
│   │   ├── trips/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── actions.ts
│   │   │   └── _components/
│   │   │
│   │   └── users/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── actions.ts
│   │       └── _components/
│   │
│   ├── (public)/                        ← No-auth public pages
│   │   └── book/
│   │       └── [slug]/
│   │           └── page.tsx             ← Customer booking form
│   │
│   ├── api/                             ← API routes (webhooks only)
│   │   └── webhooks/
│   │       └── wati/route.ts            ← WhatsApp callback (v2)
│   │
│   ├── layout.tsx                       ← Root layout (fonts, metadata)
│   └── globals.css                      ← Tailwind base styles
│
├── components/
│   ├── ui/                              ← shadcn/ui (auto-generated, don't edit)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   └── shared/                          ← App-level reusable components
│       ├── data-table.tsx               ← Generic sortable/filterable table
│       ├── page-header.tsx              ← Page title + breadcrumbs
│       ├── status-badge.tsx             ← Generic colored status pill
│       ├── currency-display.tsx         ← INR formatted display
│       ├── phone-display.tsx            ← Formatted phone display
│       ├── pagination-controls.tsx      ← Reusable pagination UI
│       └── confirm-dialog.tsx           ← Destructive action confirmation
│
├── lib/
│   ├── supabase/                        ← Client creation ONLY
│   │   ├── server.ts                    ← createServerClient()
│   │   ├── client.ts                    ← createBrowserClient()
│   │   └── middleware.ts                ← For Next.js middleware auth
│   │
│   ├── services/                        ← Business logic (Layer 2)
│   │   ├── lr.ts                        ← createLR, transitionStatus
│   │   ├── lr-state-machine.ts          ← validateTransition()
│   │   ├── trips.ts                     ← dispatchTrip, createTrip
│   │   ├── hubs.ts                      ← createHub, updateHub
│   │   ├── booking.ts                   ← acceptBooking, rejectBooking
│   │   └── users.ts                     ← inviteUser, updateUserRole
│   │
│   ├── db/                              ← Typed Supabase queries (Layer 3)
│   │   ├── lr.ts                        ← getLRById, getLRList, insertLR
│   │   ├── lr-status-history.ts         ← insertStatusHistory
│   │   ├── hubs.ts                      ← getHubsByTenant, insertHub
│   │   ├── trips.ts                     ← getTripsByRoute, insertTrip
│   │   ├── vehicles.ts                  ← getVehiclesByTenant
│   │   ├── drivers.ts                   ← getDriversByTenant
│   │   ├── booking-requests.ts          ← getPendingBookings
│   │   ├── proof-of-delivery.ts         ← insertProofOfDelivery
│   │   └── to-pay-collections.ts        ← insertToPayCollection
│   │
│   ├── validations/                     ← Zod schemas per domain
│   │   ├── lr.ts                        ← lrCreateSchema, lrUpdateSchema
│   │   ├── hub.ts                       ← hubCreateSchema
│   │   ├── vehicle.ts                   ← vehicleCreateSchema
│   │   ├── trip.ts                      ← tripCreateSchema
│   │   ├── booking.ts                   ← bookingRequestSchema
│   │   └── user.ts                      ← userInviteSchema
│   │
│   ├── auth/                            ← Auth utilities
│   │   ├── require-role.ts              ← requireRole() guard
│   │   └── session.ts                   ← getSession(), getCurrentUser()
│   │
│   ├── utils/                           ← Pure utility functions
│   │   ├── format-currency.ts           ← paiseToCurrency(), rupeesToPaise()
│   │   ├── format-phone.ts             ← formatPhoneDisplay(), normalizePhone()
│   │   ├── format-vehicle.ts            ← formatVehicleNumber()
│   │   └── format-date.ts              ← formatDateIST()
│   │
│   ├── types/                           ← Shared TypeScript types
│   │   ├── action-result.ts             ← ActionResult<T> + helpers
│   │   └── supabase.ts                  ← Auto-generated by Supabase CLI
│   │
│   ├── constants/                       ← App-wide constants
│   │   ├── lr-statuses.ts               ← LR_STATUSES array, status labels
│   │   ├── payment-modes.ts             ← PAYMENT_MODES
│   │   └── pagination.ts               ← DEFAULT_PAGE_SIZE = 25
│   │
│   └── hooks/                           ← Shared React hooks (client-side)
│       ├── use-debounce.ts
│       └── use-pagination.ts
│
├── supabase/
│   ├── config.toml                      ← Supabase local config
│   ├── seed.sql                         ← Dev seed data
│   └── migrations/                      ← SQL migrations (ordered)
│       ├── 20250101000001_tenants.sql
│       ├── 20250101000002_users.sql
│       ├── 20250101000003_hubs.sql
│       └── ...
│
├── public/                              ← Static assets
├── .env.local                           ← Dev environment (never commit)
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .nvmrc                               ← Pins Node v20
```

## Key Rules

1. **Feature-scoped `_components/`**: Components used by only one feature live inside that feature's `_components/` directory. The `_` prefix prevents Next.js from treating it as a route segment.

2. **Shared `components/shared/`**: Components used by 2+ features (e.g., `DataTable`, `StatusBadge`) live here.

3. **No barrel exports**: Do NOT create `index.ts` barrel files — they cause circular dependencies and hurt tree-shaking.

4. **`lib/services/` vs `lib/db/`**: Services contain business logic and orchestration. DB helpers contain only typed Supabase queries with no business rules.

5. **Server Actions in `actions.ts`**: Each feature's Server Actions live in a single `actions.ts` file at the feature route level. Don't mix unrelated features.

6. **`loading.tsx` is mandatory**: Every feature route must have a `loading.tsx` with a skeleton UI. A single root `error.tsx` at `(dashboard)/error.tsx` handles unexpected errors.
