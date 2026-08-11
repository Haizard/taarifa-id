# TAARIFA_ID — UI Structure (Sitemap & Navigation)

## 1. Global Navigation Model

TAARIFA_ID behaves like a native iOS app shell wrapped in a responsive web layout:

- **Large screen (≥1024px):** persistent **left glass sidebar** (icons + labels) + a top glass
  header bar (search, notifications, avatar). Content area uses a card-based grid.
- **Small screen (<768px):** the sidebar collapses into an **iOS-style bottom tab bar**
  (5 icons max, frosted-glass, floating with rounded corners and safe-area padding), plus a
  top nav bar with a large title that shrinks on scroll (iOS "large title" pattern).
- **Tablet (768–1023px):** bottom tab bar OR a collapsible sidebar (icon-only, expandable on tap) — pick one and stay consistent; recommend collapsible sidebar.

## 2. Public Site (unauthenticated)

```
/                          Front page
  ├── Section 1: Logo + Slogan + Menu (sticky glass header)
  ├── Section 2: Product explainer slides (swipeable card carousel, iOS page-dots)
  ├── Section 3: Partner logos (hyperlinked, horizontal glass strip)
  ├── Section 4: Marquee of Individual/Family/School/Business/Institution logos
  ├── Section 5: Live counters (glass stat cards, 2-per-row on mobile)
  └── Section 6: Footer ("Sunriver Systems" credit)

/register                  Multi-step registration (stepper, iOS-style progress dots)
/login                     Login (+ "RESELLER" badge/banner for non-Individual types)
/forgot-password           Reset request → SMS code → new password
/profile/:profileId        Public QR-resolved profile view (or payment/renewal redirect if expired)
```

## 3. Authenticated Dashboard (Individual / Admin / User)

```
/dashboard/overview                 Home — glass stat cards, quick actions, profile completeness ring
/dashboard/profile/individual       Individual profile editor (tabs: Basic, Health, Residence, Desperate, Emergency, Employment, Status)
/dashboard/profile/family           Family profile editor (Family details, Doctor, Linking Code, Members list)
   /members/:memberId/adult         Adult member editor
   /members/:memberId/underage      Underage member editor (+ School details)
/dashboard/profile/school           School details + Beneficiary switch (Student/Employee) + Members list
/dashboard/profile/business         Business details + Employees list
/dashboard/profile/institution      Institution details + Employees list
/dashboard/sub-accounts             Admin only — list Users (Active/Inactive), create/lock/reset
/dashboard/printable                Printable ID card preview + field selection (P-flag toggles)
/dashboard/payments                 Payment history, renew now, expiry countdown card
/dashboard/settings
   /profile-branding                Name, slogan, colors, logo, address (Admin)
   /password                        Change password
   /move-account                    Move Account flow (Profile ID + credentials)
/dashboard/notifications            SMS/alert history
```

## 4. System Admin Console

```
/admin/dashboard          Real-time monitoring widgets, KPI glass cards (2-per-row mobile)
/admin/accounts           All accounts, filters, bulk actions, activate paid accounts
/admin/users              Roles & permissions management
/admin/payments           Payment reconciliation, manual activation by Profile ID/Amount/Duration
/admin/reports            System reports, URL-access analytics
/admin/custom-fields      Create extra fields per account type
/admin/lookups            Manage LOVs (acute conditions, relation types, employment types…)
/admin/settings           Multi-environment toggles (staging/production), notification templates
```

## 5. Screen Composition Pattern (applies to every page)

Every page = **Header (glass, large title) → Content (grid of glass cards/forms) → optional
floating action button (bottom-right, iOS "+"-style circular glass button)**.

Every form section (e.g. "Basic Health Details") is its own **glass card ("grouped inset
list" iOS pattern)** with a section title, rows separated by hairline dividers
(`rgba(255,255,255,0.35)`), and right-aligned inputs — mirroring iOS Settings.app list groups.

## 6. Responsive Grid Rule (mandatory)

- **Mobile (<768px):** all card/stat/list-tile grids render **2 items per row**
  (`grid-template-columns: repeat(2, 1fr); gap: 12px;`), except long-form input rows and
  full-width forms, which stay single column.
- **Tablet:** 3 items per row.
- **Desktop:** 4 items per row for stat/summary cards; forms remain max-width ~640–720px
  centered in a glass panel, never full browser width.

## 7. Component Inventory (see `04_UI_DESIGN_SYSTEM.md` for visual spec)

`GlassCard`, `GlassButton` (primary/secondary/destructive), `SegmentedControl`,
`IOSListGroup` + `IOSListRow`, `IOSSwitch`, `IOSStepper`, `TabBar`, `Sidebar`,
`LargeTitleHeader`, `SearchBar`, `Avatar`, `StatCard`, `ProgressRing`, `Sheet` (modal that
slides up from bottom on mobile, centered glass modal on desktop), `Toast`, `QRCodeCard`,
`PrintableCardPreview`, `OTPInput`, `Stepper/Wizard` (registration), `EmptyState`.
