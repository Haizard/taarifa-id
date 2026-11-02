# TAARIFA ID — Runbook

Monorepo: pnpm workspaces with a Next.js full-stack app (frontend + API route handlers) at the repo root and a shared Drizzle schema. The NestJS API has been replaced by Next.js route handlers under `src/app/api/**`, so a **single Vercel deployment** serves both the UI and the API (full serverless).

```
. (repo root)   Next.js 15 app (single deployment: UI + API route handlers)
packages/db     Drizzle ORM schema + migrations + seed
apps/api        Legacy NestJS reference (not deployed)
```

## Prerequisites

- PostgreSQL running locally (dev DB: `taarifa_id`)
- pnpm installed

## Database

The app uses PostgreSQL via Drizzle. In local development, put a local Postgres `DATABASE_URL` in the ignored `.env.local` file. `.env.local` takes precedence over `.env`, including for database scripts such as `pnpm db:push` and `pnpm db:seed`. For deployed builds, set `DATABASE_URL` in Vercel's Production environment to the Supabase connection string (or set `supabase_session_pooler`); Vercel supplies those values to the production deployment when changes reach `main`. The Vercel production build applies additive SQL files from `packages/db/migrations/` before building the app; previews skip this production-only step. Supabase connections enable SSL automatically. The standalone `supabase_db_password` is applied in memory so a rotated password does not leave the URLs' embedded password stale.

To use another database locally, set `DATABASE_URL` in `.env.local` (and set `DATABASE_SSL=true` if required). The development fallback is `postgresql://taarifa:taarifa_dev_2026@localhost:5432/taarifa_id`.

Start Postgres (Debian/Ubuntu 15):

```bash
pg_ctlcluster 15 main start
```

## Install

```bash
pnpm install
```

`packages/db` has a `prepare` script so its `dist` is built automatically during install (required by the root app and the API).

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
pnpm dev        # web + API on http://localhost:3000
```

The API is served by Next.js route handlers under `/api` (same origin as the UI) — no separate API server and no rewrites needed.

Required env (Vercel dashboard or local `.env`): `DATABASE_URL` (or `supabase_session_pooler`), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `WEB_URL`. Development fallbacks exist in code for all of these. See `.env.example`.

## API conventions

- All routes are under `/api`, e.g. `POST /api/auth/login`.
- Auth routes and the `public` module are public; everything else requires a Bearer JWT.
- Roles: `individual`, `admin`, `user`, `system_admin`. Admin/system-admin-only actions are role-guarded in the route table (`src/lib/server/router.ts`).
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
| career | `GET|PUT /career/me`, `POST /career/share`, `DELETE /career/share/:id`, `POST /career/leave-organization`, employer `GET|POST /career/employer/records`, `POST /career/employer/records/:id/resolve`, worker `POST /career/records/:id/respond`, public `GET /career/share/:token` |
| jobs | worker `GET|PUT /jobs/preferences`, `GET /jobs`, `GET /jobs/applications`, `POST /jobs/:id/apply`, `DELETE /jobs/applications/:id`, `GET|POST /jobs/applications/:id/messages`, `GET /jobs/invitations`, `POST /jobs/invitations/:id/respond`, `POST /jobs/:id/safety-actions`, `POST /jobs/applications/:id/safety-actions`, `GET /job-safety/blocks`, `DELETE /job-safety/blocks/:id`; employer `GET|POST /employer/jobs`, `PATCH /employer/jobs/:id`, `POST /employer/jobs/:id/invitations`, `GET /employer/jobs/:id/applications`, `PATCH /employer/applications/:id`, `GET /employer/candidates`, `GET|POST /employer/applications/:id/messages`, `POST /employer/applications/:id/safety-actions`; system admin `GET /admin/job-safety/reports`, `PATCH /admin/job-safety/reports/:id` |
| provider verification | organization `GET|POST /marketplace/provider/verification`; system admin `GET /admin/providers/verification-requests`, `PATCH /admin/providers/verification-requests/:id` |

## Frontend

- Public: `/`, `/register`, `/login`, `/forgot-password`, `/profile/[profileId]`, `/renew/[profileId]`
- Dashboard (authenticated): `/dashboard`, `/dashboard/profile`, `/dashboard/payments`, `/dashboard/printable`, `/dashboard/sub-accounts`, `/dashboard/settings`, `/dashboard/move-account`, `/dashboard/notifications`
- System admin console: `/admin/dashboard`, `/admin/accounts`, `/admin/users`, `/admin/payments`, `/admin/reports`
- Service marketplace: clients browse `/dashboard/services`, submit `/dashboard/services/:id` requests, and manage offers in `/dashboard/requests`; business and school admins set up `/dashboard/provider` services, respond in `/dashboard/provider/requests`, and assign active employee member accounts to accepted work. Clients see assigned workers; employee accounts use `/dashboard/work` to view their assigned jobs.
- Marketplace privacy: a request shares only the form answers and area entered for that request. `matching_providers` shares it with providers in the same category and region (and district when supplied); saved profile/health data is not attached automatically.
- Worker assignment and review privacy: only the accepted provider can assign its own active employee sub-accounts; the worker can view only jobs assigned to their account, and clients see worker names for their own request. Assignment changes are recorded in `service_assignment_events`. Clients can separately review the provider and assigned workers after completion; worker ratings remain private to the worker and organization, while review appeals are handled by system admins and audited.
- Career portability: individual and employee accounts can manage a private career profile at `/dashboard/career`. Organization admins can submit dated employment records for active employee members; workers acknowledge or dispute pending records. Workers can create purpose-limited links to selected verified records (7/14/30-day expiry) and revoke them. Managed employees can leave an organization after resolving active assignments while keeping their own account and career history. Share views omit contact details and client/service data. Career export remains to be implemented.
- Job discovery: adult individual and employee users can opt into candidate visibility (off by default), choose categories and locations, browse openings at `/dashboard/jobs`, and select which career information to share with each application. The current organization is excluded from candidate search and contact information is withheld. Organization admins publish jobs and review consenting candidates/applicants at `/dashboard/provider/jobs`. Applicants and the hiring organization message within the application; only those participants can access the thread, and withdrawal closes it for new messages. Employers can invite candidates to open roles; invitations share no career data until the worker accepts and chooses what to share. Reports are reviewed at `/admin/job-safety`; blocks hide counterpart accounts from discovery and revoke application career sharing.
- Provider verification: organization admins submit their registered name and licence/registration reference from `/dashboard/provider`. System admins review in `/admin/provider-verification`; until approved, that provider cannot post jobs, invite candidates, or view applicant career details. Evidence documents are still checked offline; file upload and renewal are future work.
- Provider trust display: public and dashboard service listings show whether an organization has been verified by the platform. Unverified providers can still list services and receive requests in this pilot; clients see the status before sending information.

## Test accounts (dev)

| Role | Username | Password |
| --- | --- | --- |
| System admin | `systemadmin` | `admin1234` |

Regular accounts register via the app; first login uses the SMS code shown in the register response (`sms_code_dev`).

## Scripts

```bash
pnpm run build          # build @taarifa/db then next build
pnpm run typecheck
pnpm run db:migrate:production # runs only in Vercel's production build environment
```
