# TAARIFA_ID — Business & Access Rules

## 1. Roles

| Role | Can register directly | Sees own data | Sees sub-account data | Notes |
|---|---|---|---|---|
| Individual | Yes | Yes | N/A | Self-usage only |
| Admin (Family/School/Business/Institution) | Yes | Yes (own admin profile only) | **No** | Manages sub-accounts operationally but is blocked from viewing their personal/health data |
| User (sub-account) | No — created by Admin | Yes | N/A | Username/password issued by Admin |
| System Admin | N/A (platform owner) | All (for support/ops) | All | Super-user |

## 2. Admin Capabilities
1. Set profile name and slogan.
2. Set annual SMS prices.
3. Set profile colors, logo, address.
4. Create usernames and passwords for sub-accounts.
5. Lock a User account.
6. Reset a User's password.
7. Sub-accounts expire **31 Dec** every year; the Admin account itself **never expires**.
8. Send SMS alerts/reminders to sub-account holders.
9. Request automatic password reset for self (Admin/Individual).
10. View list of sub-account Users filtered by Active/Inactive.

## 3. System Admin Capabilities (superset of Admin, plus)
1. Activate paid accounts.
2. Access all system reports.
3. Create extra custom fields as needed.
4. View periodic URL access counts.
5. Full panel control: user roles & permissions, real-time monitoring, dashboards, custom
   workflows/automation, search & filtering, bulk actions & inline editing, notifications &
   alerts, multi-environment support (staging/production).

## 4. Login Rules
- Normal login = username + password.
- **First login** uses the SMS confirmation code instead of a password.
- If `account_type != Individual`, show a **"RESELLER"** indicator on the login/landing
  experience (applies to School, Family, Business, Institution).
- Forgot-password flow available to all roles; Admin can also reset a sub-account's password
  directly.

## 5. Registration Rules
Required fields: First name, Middle name, Last name, Birthdate, Password + confirmation,
Gender (Male/Female), Mobile number (unique, starts with `255`), Email, Account Type
(Individual/School/Family/Business/Institution), Nationality (Tanzanian → NIDA number;
Foreigner → Passport number). A confirmation code is SMS'd for use at first login.

## 6. Nationality / ID Logic
- Nationality = Tanzanian → **NIDA number** field required.
- Nationality = Foreigner → **Passport number** field required.
- Applies to every person-level profile: Individual, Family Adult, Family Underage (passport
  optional "if available" for minors).

## 7. Emergency Contacts Rule
- Exactly up to **3 contacts** may be entered per profile.
- Entry order matters: **1st = Prime**, 2nd = Option 2, 3rd = Option 3.
- Fields: Full Name, Mobile (2), Alternative number (2), Relation type (LOV), Residence
  details, Fluent language, Region/District/Ward/Local Authority, Extra Notes.

## 8. Employment Rule
- First selection is the employment-type LOV: Government, Foreign Government, Foreign
  Agency, Company, Cooperate, Self Employed, **Not Working**.
- If **Not Working** is selected, the rest of the Employment Details form (Employer details,
  Supervisor details) must be **locked/disabled**.

## 9. Profile Expiry & Payment Rule
- Every profile (except root Admin/Reseller accounts, which never expire) has `paid_amount`,
  `paid_date`, `expire_date` (School Reseller accounts additionally track `renew_date`).
- On expiry, the **QR code and Profile-ID URL automatically redirect to the payment/renewal
  form** instead of resolving the profile.
- System Admin activates paid accounts by matching **Profile ID + Amount + Duration**; once
  matched, the URL/QR reactivate.
- Payments accepted via **mobile wallets and bank accounts**.

## 10. Move Account Rule
- An Individual/User can move their account to a different Admin-controlled scheme
  (School/Business/Family/Institution) by supplying their **Profile ID + login
  credentials**. This transfers/relinks the profile rather than duplicating it.

## 11. Family-Specific Rules
- **Linking Code**: lets a Family pull in a person already registered under a different
  scheme (e.g. a Student profile); the family profile then displays on top of / alongside
  the linked profile rather than duplicating data entry.
- **Underage members** get a reduced field set (no employment section) plus a **School
  details** sub-section.

## 12. School-Specific Rules
- A School's "Beneficiary" toggle determines whether the member form shown is the
  **Student** field set or the **Employee** field set.
- Students get a `Stream` LOV (I–VII) instead of employment fields.
- School accounts are explicitly called out as **Reseller** accounts that can **renew** their
  own profile (tracked via `renew_date` in addition to `expire_date`).

## 13. Printable Card Rules
1. Every account type has a printable preview.
2. Mandatory fields on every printed card: **Profile Code** and **QR Code**.
3. Any field with **no flag** is public/viewable by default (shown on the public profile
   page).
4. Fields flagged **PU** (Public/Hide) can be toggled hidden by the profile owner.
5. Fields flagged **P** are optional-for-print, chosen at print time depending on card space
   and necessity.
6. Fields flagged **PU_P** combine both behaviors (togglable visibility AND optional print).

## 14. Data We Must Never Expose to an Admin
Per rule §2 above, an Admin must never be able to query, list, export, or view the personal,
health, or emergency-contact details of their own sub-accounts — enforce this at the API
authorization layer (row-level security / policy check), not just by hiding it in the UI.
