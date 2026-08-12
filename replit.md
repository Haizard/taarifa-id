# TAARIFA ID — Runbook

Monorepo: pnpm workspaces with a Next.js full-stack app (frontend + API route handlers) and a shared Drizzle schema. The NestJS API has been replaced by Next.js route handlers under `apps/web/src/app/api/**`, so a **single Vercel deployment** serves both the UI and the API (full serverless).

```
apps/web        Next.js 15 (single deployment: UI + API route handlers)
packages/db     Drizzle ORM schema + migrations + seed
```

## Prerequisites

- PostgreSQL running locally (dev DB: `taarifa_id`)
- pnpm installed

## Database

The app uses PostgreSQL via Drizzle. If `DATABASE_URL` is set, it is used as the explicit connection. Otherwise it automatically uses the Supabase session pooler from the project `.env`; Supabase connections enable SSL automatically. The standalone `supabase_db_password` is applied in memory so a rotated password does not leave the URLs' embedded password stale.

To use another database locally, set `DATABASE_URL` in `.env` (and set `DATABASE_SSL=true` if required).

Start Postgres (Debian/Ubuntu 15):

```bash
pg_ctlcluster 15 main start
```

## Install

```bash
pnpm install
```

`packages/db` has a `prepare` script so its `dist` is built automatically during install (required by `apps/web` and the API).

## Push schema + seed

```bash
pnpm db:push        # push Drizzle schema to the database
pnpm db:seed        # LOV values + field visibility defaults
```

## Create a system admin

```bash
cd packages/db
ADMIN_USERNAME=systemadmin ADMIN_PASSWORD=admin1234 npx tsx scripts/create-system-admin.ts
```

`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_MOBILE` are optional (defaults: `systemadmin` / `admin1234` / `255700000000`).

## Run locally

```bash
pnpm dev:web        # web + API on http://localhost:3000
```

The API is served by Next.js route handlers under `/api` (same origin as the UI) — no separate API server and no rewrites needed.

Required env (Vercel dashboard or local `.env`): `DATABASE_URL` (or `supabase_session_pooler`), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `WEB_URL`. Development fallbacks exist in code for all of these. See `apps/web/.env.example`.

## API conventions

- All routes are under `/api`, e.g. `POST /api/auth/login`.
- Auth routes and the `public` module are public; everything else requires a Bearer JWT.
- Roles: `individual`, `admin`, `user`, `system_admin`. Admin/system-admin-only actions are role-guarded in the route table (`apps/web/src/lib/server/router.ts`).
- Mock SMS: OTP codes are returned as `sms_code_dev` in dev responses (no real SMS gateway).
- Mock payments: payments confirm inline (serverless-safe) and activate the profile immediately.

### Endpoint map

| Module | Routes |
| --- | --- |
| auth | `POST /auth/register`, `first-login`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `change-password`, `GET /auth/me` |
| accounts | `GET /accounts/me`, `GET|POST /accounts/sub-accounts`, `PATCH /accounts/:id/lock\|unlock`, `POST /accounts/reset-password`, `POST /accounts/move` |
| profiles | `GET /profiles`, `GET /profiles/entity`, `GET|POST /profiles/members`, `PUT /profiles/entity`, `GET|PUT /profiles/:id`, `PUT /profiles/:id/sub-forms` |
| payments | `POST /payments`, `GET /payments/history`, `GET /payments/status` |
| qrcode | `GET /qrcode/:profileId` |
| lookups | `GET /lookups` |
| system-admin | `/admin/dashboard`, `/admin/accounts`, `/admin/users`, `/admin/payments`, `/admin/reports/url-access`, `/admin/activate`, `/admin/lookups`, `/admin/logs` (all `system_admin` only) |
| public | `GET /public/profiles/:profileId`, `GET /public/stats` |

## Frontend

- Public: `/`, `/register`, `/login`, `/forgot-password`, `/profile/[profileId]`, `/renew/[profileId]`
- Dashboard (authenticated): `/dashboard`, `/dashboard/profile`, `/dashboard/payments`, `/dashboard/printable`, `/dashboard/sub-accounts`, `/dashboard/settings`, `/dashboard/move-account`, `/dashboard/notifications`
- System admin console: `/admin/dashboard`, `/admin/accounts`, `/admin/users`, `/admin/payments`, `/admin/reports`

## Test accounts (dev)

| Role | Username | Password |
| --- | --- | --- |
| System admin | `systemadmin` | `admin1234` |

Regular accounts register via the app; first login uses the SMS code shown in the register response (`sms_code_dev`).

## Scripts

```bash
pnpm run build          # typecheck + build all packages
pnpm run typecheck
```
