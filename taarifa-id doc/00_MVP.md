# TAARIFA_ID — MVP Definition (Phase One, 2025)

> Source: `TAARIFA_ID_FINAL.docx/pdf`. Note: the uploaded `TAARIFA_ID.txt` describes an unrelated
> tourism-site content outline (destinations, safaris, accommodation). It does not match the
> TAARIFA_ID identity-platform spec, so it has been treated as out-of-scope for this MVP. Flag this
> to the product owner in case a second product brief was attached by mistake.

## 1. What TAARIFA_ID Is

TAARIFA_ID is a **digital identity & emergency-profile platform**. Every registered entity
(a person, a family, a school, a business, or an institution) gets a **unique Profile ID**,
a **QR code**, and a **printable ID card** that exposes a controlled subset of their profile
data (basic identity, health, residence, emergency contacts) for use in emergencies, access
control, or general identification — similar in spirit to a national ID card, but
self-service and account-type aware.

Revenue model: **paid annual subscriptions per profile**, managed through mobile money /
bank payment, with automatic expiry and reactivation via payment.

## 2. Actors

| Role | Description |
|---|---|
| **Individual** | Single self-registered user, own profile only. |
| **Admin** | Registers as **Family, School, Business, or Institution** ("Reseller" account type). Manages many sub-accounts (Users) but cannot view sub-account personal data. |
| **User** | A sub-account that belongs to an Admin (e.g. a family member, a student, an employee). |
| **System Admin** | TAARIFA_ID super-user / platform operator. Activates paid accounts, manages reports, custom fields, and analytics. |

## 3. MVP Scope (build first)

### 3.1 Core platform
- [ ] Public marketing front page (logo/slogan/menu, product explainer slides, partner logos, live counters of Individuals/Families/Schools/Businesses/Institutions, footer).
- [ ] Registration flow (all 5 account types) with SMS confirmation code as first-login credential.
- [ ] Login flow, with a **"RESELLER"** banner shown for any non-Individual account type.
- [ ] Forgot password / reset flow (self-service request, Admin-triggered reset for sub-accounts).
- [ ] Role-based access control: Individual / Admin / User / System Admin.
- [ ] Profile Information Page per account type (see §3.2), with field-level `PU` (Public/Hide) and `P` (Printable) visibility flags respected everywhere.
- [ ] Printable ID card preview (Profile Code + QR code mandatory; other fields controlled by `PU`/`P` flags).
- [ ] QR Code + Profile URL generation; URL auto-redirects to a payment/renewal page once the profile is expired.
- [ ] Payment integration (mobile wallet + bank), with System Admin manually/automatically activating accounts by Profile ID + amount + duration.
- [ ] Admin sub-account management: create username/password, lock/unlock, reset password, list Active/Inactive Users.
- [ ] Move Account (an Individual/User can migrate to another account-type scheme by supplying Profile ID + credentials).
- [ ] "Linking Code" (Family): attach an already-registered profile from another scheme (e.g. a Student) into a Family profile.
- [ ] Annual expiry job (31 Dec) for all sub-accounts; Admin/Reseller accounts never expire; Individual accounts expire on their own paid cycle.
- [ ] SMS notifications: renewal reminders, reset codes, expiry alerts.
- [ ] System Admin console: user roles & permissions, real-time monitoring, dashboards, custom fields, search/filter, bulk actions, notifications, staging/production support, URL access analytics.

### 3.2 Profile categories to support at MVP
| Account type | Sections |
|---|---|
| Individual | Basic details, Basic Health, Residence, Desperate (acute) conditions, Emergency Contacts, Employment, Profile Status |
| Family | Family details, Family Doctor, Linking Code, Adult member(s) [same fields as Individual + Nationality/NIDA/Passport], Underage member(s) [basic details, emergency contacts, health, desperate conditions, school], Profile Status |
| School | School details, Beneficiary switch (Student/Employee), Student basic+residence+health+desperate+emergency, Employee basic+residence+health+desperate+emergency+employment, Profile Status (Reseller renewal) |
| Business | Business details, Employee (basic+residence+health+desperate+emergency+employment), Profile Status |
| Institution | Institution details, Employee (basic+residence+health+desperate+emergency+employment), Profile Status |

### 3.3 Explicitly deferred (post-MVP / Phase Two candidates)
- Advanced analytics/BI dashboards beyond basic counts.
- Multi-language support.
- Native mobile apps (MVP is responsive web only, iOS-styled).
- Custom workflow/automation builder for System Admin (build a basic version only).
- Marketplace / partner portal beyond static logo links.
- The unrelated "tourism site" content in `TAARIFA_ID.txt` (needs a product-owner decision on whether it belongs to a separate product).

## 4. Key Business Rules (see `05_BUSINESS_RULES.md` for full detail)
1. Admin can never see sub-account personal data.
2. Sub-accounts (Users) expire every **31 December**; the Admin/Reseller account itself never expires.
3. Expired profile → QR/Profile URL auto-redirects to payment/renewal form.
4. Emergency Contacts: max **3 per profile**, first entry = Prime contact.
5. Nationality logic: Tanzanian → NIDA number required; Foreigner → Passport number required.
6. Employment "Not working" locks the rest of the employment sub-form.
7. Field-level flags: **no flag** = public/viewable by default, **PU** = Public/Hide toggle available, **P** = optional on the printable card.

## 5. Definition of Done for MVP
- All 5 account types can register, log in, complete their profile, generate a QR-linked
  Profile ID, and produce a printable ID preview.
- Payments can activate/renew a profile and the expiry logic works end-to-end.
- Admin/User/System Admin permission boundaries are enforced (verified by test cases, not just UI hiding).
- The entire UI (web large-screen + mobile) follows the iOS-glassmorphism design system in
  `04_UI_DESIGN_SYSTEM.md`.
