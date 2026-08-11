# TAARIFA ID — Runbook

Monorepo: pnpm workspaces with a Next.js frontend, NestJS API, and shared Drizzle schema.

```
apps/web        Next.js 15 (port 3000, exposed for preview)
apps/api        NestJS 11 (port 4000, proxied via /api rewrites)
packages/db     Drizzle ORM schema + migrations + seed
```

## Prerequisites

- PostgreSQL running locally (dev DB: `taarifa_id`)
- pnpm installed

## Database

The app uses PostgreSQL via Drizzle. If `DATABASE_URL` is set, it is used as the explicit connection. Otherwise it automatically uses the Supabase session pooler from the root `.env`; Supabase connections enable SSL automatically. The standalone `supabase_db_password` is applied in memory so a rotated password does not leave the URLs' embedded password stale.

To use another database locally, set `DATABASE_URL` in `.env` (and set `DATABASE_SSL=true` if required).

Start Postgres (Debian/Ubuntu 15):

```bash
pg_ctlcluster 15 main start
```

## Install

```bash
pnpm install
```

## Push schema + seed

```bash
pnpm db:push        # push Drizzle schema to the database
pnpm db:seed        # LOV values + field visibility defaults
```

## Create a system admin

```bash
cd apps/api
ADMIN_USERNAME=systemadmin ADMIN_PASSWORD=admin1234 npx tsx scripts/create-system-admin.ts
```

`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_MOBILE` are optional (defaults: `systemadmin` / `admin1234` / `255700000000`).

## Run locally

```bash
pnpm dev            # starts API (4000) and web (3000) together
```

Or separately:

```bash
pnpm dev:api        # API on http://localhost:4000/api
pnpm dev:web        # web on http://localhost:3000
```

The web dev server rewrites `/api/*` to the API server, so the browser only talks to port 3000 (single exposed port for preview).

Required env for the API: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`. Development fallbacks exist in code for all of these.

## API conventions

- All routes are under `/api` (global prefix), e.g. `POST /api/auth/login`.
- Auth routes and the `public` module are marked `@Public()`; everything else requires a Bearer JWT.
- Roles: `individual`, `admin`, `user`, `system_admin`. Admin-only actions use `@Roles()`.
- Mock SMS: OTP codes are returned as `sms_code_dev` in dev responses (no real SMS gateway).
- Mock payments: payments auto-confirm after ~1.5s and activate the profile.

### Endpoint map

| Module | Routes |
| --- | --- |
| auth | `POST /auth/register`, `first-login`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `change-password`, `GET /auth/me` |
| accounts | `GET /accounts/me`, `GET|POST /accounts/sub-accounts`, `PATCH /accounts/:id/lock\|unlock`, `POST /accounts/reset-password`, `POST /accounts/move` |
| profiles | `GET /profiles`, `GET /profiles/entity`, `POST /profiles/members`, `PUT /profiles/:id`, `PUT /profiles/:id/sub-forms`, `GET /profiles/:id` |
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
