# TAARIFA_ID — Project Structure

## 1. Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript + Tailwind CSS** | SSR for the public front page/SEO, easy responsive breakpoints, huge ecosystem for glassmorphism/blur utilities. |
| State/Data | React Query (server cache) + Zustand (light UI state) | Predictable, low-boilerplate. |
| Backend | **Node.js (NestJS) or Laravel** exposing a REST/JSON API | Both give you clean module boundaries per account-type domain. Pick NestJS if the team is JS-first, Laravel if PHP-first (common in TZ hosting environments). |
| Database | **PostgreSQL** | Strong relational integrity for the profile/role hierarchy, JSONB for flexible per-account-type extra fields. |
| File/Media storage | S3-compatible bucket (logos, pics, QR codes) | Keeps DB light. |
| SMS gateway | Local aggregator (e.g. Beem, Africa's Talking) | Confirmation codes, reminders. |
| Payments | Mobile money + bank aggregator (e.g. Selcom, Azampay, Flutterwave) | Matches "mobile wallets and bank accounts" requirement. |
| QR generation | `qrcode` (node) / `endroid/qr-code` (php) | Generates PROFILE ID + URL QR. |
| Auth | JWT access/refresh tokens, SMS OTP for first login | Matches "confirmation code used in place of password" rule. |

## 2. Monorepo Layout

```
taarifa-id/
├── apps/
│   ├── web/                       # Next.js app (public site + all dashboards)
│   │   ├── app/                   # App Router
│   │   │   ├── (public)/
│   │   │   │   ├── page.tsx                # Front page
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   └── profile/[profileId]/page.tsx   # Public QR-resolved profile view
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx              # iOS-style sidebar/tab shell
│   │   │   │   ├── overview/page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   ├── individual/page.tsx
│   │   │   │   │   ├── family/page.tsx
│   │   │   │   │   ├── school/page.tsx
│   │   │   │   │   ├── business/page.tsx
│   │   │   │   │   └── institution/page.tsx
│   │   │   │   ├── sub-accounts/page.tsx    # Admin only
│   │   │   │   ├── printable/page.tsx
│   │   │   │   ├── payments/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   └── move-account/page.tsx
│   │   │   └── (system-admin)/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── accounts/page.tsx
│   │   │       ├── payments/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       ├── custom-fields/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                # Design-system primitives (Button, Card, GlassPanel, Sheet, TabBar…)
│   │   │   ├── forms/             # Reusable field groups (ResidenceFields, EmergencyContactFields…)
│   │   │   ├── profile/           # Per-account-type form sections
│   │   │   └── layout/            # Shell, Sidebar, TabBar, Header
│   │   ├── lib/                   # api client, auth, utils, validators (zod)
│   │   ├── styles/                # tailwind.config.ts, globals.css, design tokens
│   │   └── public/
│   └── api/                        # NestJS (or Laravel) backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── individual/
│       │   │   ├── family/
│       │   │   ├── school/
│       │   │   ├── business/
│       │   │   ├── institution/
│       │   │   ├── emergency-contacts/
│       │   │   ├── health/
│       │   │   ├── employment/
│       │   │   ├── payments/
│       │   │   ├── sms/
│       │   │   ├── qrcode/
│       │   │   ├── system-admin/
│       │   │   └── lookups/        # LOVs: acute conditions, relation types, employment types…
│       │   ├── common/             # guards, interceptors, pipes, decorators
│       │   └── main.ts
│       └── test/
├── packages/
│   ├── design-tokens/              # shared color/typography/spacing tokens (used by web + any native shell)
│   ├── types/                      # shared TypeScript interfaces/DTOs
│   └── config/                     # eslint, tsconfig, tailwind preset
├── docs/                            # this documentation set
├── docker-compose.yml
└── README.md
```

## 3. Module Boundaries (backend)

Each account-type module (`individual`, `family`, `school`, `business`, `institution`) owns:
- its own DB tables / schema slice,
- its own DTOs and validation rules (e.g. NIDA vs Passport logic),
- its own printable-card field-visibility resolver.

Shared cross-cutting modules: `emergency-contacts`, `health`, `employment`, `residence`,
`payments`, `sms`, `qrcode`, `lookups` (LOV lists), `auth`, `system-admin`.

## 4. Environments
- `local` → docker-compose (Postgres, API, Web, MailHog/SMS mock).
- `staging` → mirrors production, used for payment gateway sandbox testing (per the "Multi-Environment Support" requirement).
- `production`.

## 5. Naming Conventions
- API routes: `/api/v1/{module}/{resource}` (e.g. `/api/v1/family/members/:id`).
- DB tables: `snake_case`, plural (`emergency_contacts`, `profile_status`).
- React components: `PascalCase`, one component per file, colocated styles via Tailwind classes only (no CSS modules unless truly custom).
- Feature flags for LOV-driven fields live in `lookups` so acute-condition lists, relation types, etc. are editable by System Admin without a redeploy.
