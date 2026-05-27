# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start frontend (Next.js, port 3000)
npm run dev:web

# Start backend (Express, port 4000)
npm run dev:api

# Lint both apps (zero warnings policy)
npm run lint

# Run a DB migration
npm run db:migrate --workspace=apps/api

# Type-check web app
npx tsc --noEmit --project apps/web/tsconfig.json

# Type-check API
npx tsc --noEmit --project apps/api/tsconfig.json
```

There are no automated tests yet.

## Architecture

### Monorepo layout
- `apps/api` — Express + TypeScript REST API
- `apps/web` — Next.js 15 (App Router) frontend
- `packages/types` — shared TypeScript types imported by both apps as `@everafter/types`

### API (`apps/api`)
- Entry: `src/app.ts` — mounts routers, CORS configured for `localhost:3000`
- Auth: `src/middleware/authenticate.ts` — verifies Firebase ID token, looks up the user row in Postgres, and attaches `req.user` (`{ id, firebaseUid, email, role, onboardingComplete }`)
- Validation: `src/middleware/validate.ts` — Zod schema middleware; call `validate(schema)` for body, `validate(schema, 'query')` for query params
- DB: `src/db/client.ts` — single `pg.Pool` exported as `pool`; use `pool.connect()` + manual `BEGIN/COMMIT/ROLLBACK` for multi-statement transactions
- Routes follow the pattern: `authenticate` → `validate(schema)` → handler; role checks happen inline at the top of the handler
- Migrations live in `src/db/migrations/` as numbered `.sql` files; run with `npm run db:migrate`

### Web (`apps/web`)
- All protected pages live under `src/app/(protected)/`; the `(protected)/layout.tsx` wraps everything in `RouteGuard` (redirects unauthenticated or non-onboarded users) and renders `BottomNav`
- Firebase auth state → Zustand (`src/store/auth.store.ts`) via `AuthProvider` (`src/components/auth/AuthProvider.tsx`); the store holds `AuthUser` (minimal subset of `User`)
- API calls go through `src/lib/api/client.ts` (`apiClient.get/post/patch/delete`), which attaches the Firebase ID token automatically
- Services (`src/services/`) wrap `apiClient` calls with typed inputs/outputs; pages import from services, not directly from `apiClient`
- Data fetching uses TanStack Query (`useQuery` / `useMutation`); `staleTime` defaults to 60 s
- Styling: Tailwind with custom colors (`sage`, `beige`, `taupe`) defined in `tailwind.config.js`; shared component classes (`.btn-primary`, `.btn-ghost`, `.input`, `.card`) are defined in `src/app/globals.css`

### Database
- PostgreSQL; schema in `apps/api/src/db/schema.sql`
- Key enums: `offer_status` (`pending | accepted | rejected | cancelled`), `order_status` (`pending | completed | cancelled`), `listing_status` (`active | reserved | sold | inactive`)
- Offers table has a partial unique index `idx_offers_one_accepted` (only one accepted offer per listing)
- Orders table has a partial unique index `idx_orders_one_pending` (only one pending order per listing)
- All tables have `set_updated_at()` triggers
- Migrations: `001_initial_schema.sql`, `002_offer_status_cancelled.sql`

### Phase status
- Phase 1–3 complete: auth, onboarding, listings CRUD, image upload (S3 presigned URLs), marketplace feed with filters
- Phase 4 complete: offer workflow — full CRUD on `/offers`; endpoints: `POST /offers`, `POST /offers/buy-now`, `GET /offers/my`, `GET /offers/:id`, `PATCH /offers/:id/accept|reject|cancel`; accepting an offer auto-rejects other pending offers, reserves the listing, and creates a pending order; frontend pages at `/offers/[id]`, `/my-offers`, `/inbox`
- Phase 5 planned: orders, messages
