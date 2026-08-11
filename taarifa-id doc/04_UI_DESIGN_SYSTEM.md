# TAARIFA_ID — UI Design System
### iOS-native glassmorphism, light & translucent, web + mobile parity

Goal: on a large screen this should read like a native macOS/iPadOS app; on a small screen
it should be indistinguishable from a native iOS app. No dark backgrounds anywhere.

---

## 1. Design Tokens

### 1.1 Color palette (light, airy, never black/dark background)

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#F2F4F8` | App background — soft cool grey-blue, not white, not dark |
| `--bg-gradient-a` | `#EAF1FB` | Top-left ambient gradient stop |
| `--bg-gradient-b` | `#F7EFFB` | Bottom-right ambient gradient stop (subtle lavender) |
| `--glass-surface` | `rgba(255,255,255,0.55)` | Default card/panel fill |
| `--glass-surface-strong` | `rgba(255,255,255,0.72)` | Modals, sheets, headers |
| `--glass-surface-subtle` | `rgba(255,255,255,0.35)` | Nested rows, list divid-groups |
| `--glass-border` | `rgba(255,255,255,0.6)` | 1px hairline edge on every glass surface |
| `--glass-shadow` | `0 8px 32px rgba(31,41,55,0.10)` | Card elevation |
| `--accent-primary` | `#3B82F6` | iOS "system blue" analogue — primary actions, links |
| `--accent-secondary` | `#8B5CF6` | Secondary accent (violet) — used sparingly, badges/gradients |
| `--accent-success` | `#34C759` | iOS green — success/active status |
| `--accent-warning` | `#FF9F0A` | iOS orange — expiring soon |
| `--accent-danger` | `#FF3B30` | iOS red — errors, destructive, expired |
| `--text-primary` | `#1C1C1E` | Body text on light glass (near-black, never pure #000) |
| `--text-secondary` | `#6B7280` | Secondary/meta text |
| `--text-tertiary` | `#9CA3AF` | Placeholder/disabled |
| `--separator` | `rgba(60,60,67,0.15)` | Hairline row dividers (iOS separator) |

**Rule:** The app background is always the soft gradient (`--bg-gradient-a` → `--bg-gradient-b`
via `--bg-base`), fixed behind all scrollable content, never solid dark. Glass panels float
above it with `backdrop-filter: blur(20px) saturate(180%)`.

### 1.2 Typography

- Primary font stack: `-apple-system, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", sans-serif` — falls back to San Francisco on Apple devices for authenticity, Inter elsewhere (near-identical metrics).
- Scale (mirrors iOS type scale):
  - Large Title: 34px / bold / -0.4 tracking
  - Title 1: 28px / bold
  - Title 2: 22px / semibold
  - Title 3: 20px / semibold
  - Headline: 17px / semibold
  - Body: 17px / regular
  - Callout: 16px / regular
  - Subheadline: 15px / regular, `--text-secondary`
  - Footnote: 13px / regular, `--text-secondary`
  - Caption: 12px / regular, `--text-tertiary`

### 1.3 Spacing & radius

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 (px), 8pt-grid, iOS-standard.
- Corner radius: cards `20px`, buttons `14px`, small chips/badges `10px`, sheets/modals `28px`
  (top corners only on mobile bottom-sheets), avatars/circular buttons `999px`.
- Page horizontal padding: mobile `16px`, tablet `24px`, desktop content max-width `1200px`
  centered with `32px` gutters.

### 1.4 Elevation & blur

Three elevation levels only (iOS keeps it simple):
1. **Level 0 – Background:** the fixed gradient, no blur.
2. **Level 1 – Card/Panel:** `--glass-surface`, `blur(20px)`, `--glass-shadow`, `--glass-border` 1px.
3. **Level 2 – Sheet/Modal/Popover:** `--glass-surface-strong`, `blur(30px)`, stronger shadow `0 16px 48px rgba(31,41,55,0.16)`.

---

## 2. Layout Rules

### 2.1 Large screen (web desktop, ≥1024px)
- Fixed **glass sidebar**, 84px (icon-only) or 260px (icon+label), `--glass-surface-strong`,
  full-height, `border-right: 1px solid var(--glass-border)`.
- Top **glass header bar**, 64px, contains search field (pill-shaped, `--glass-surface-subtle`),
  notification bell, avatar menu.
- Content area: gradient background visible around/behind cards (never fully covered by opaque panels) so the glass effect reads clearly.
- Cards arranged in a responsive CSS grid, **4 stat-cards per row**, forms centered in a
  single glass panel max-width 720px.

### 2.2 Small screen (mobile web, <768px) — must feel like a native iOS app
- No visible sidebar. Use:
  - **Top nav:** large title that collapses to a small centered title + blurred bar on scroll (`position: sticky; backdrop-filter: blur(20px);`), exactly like `UINavigationBar`.
  - **Bottom tab bar:** floating, frosted glass, rounded `28px`, positioned `12px` above the
    safe-area bottom inset, max 5 icons + labels, active icon tinted `--accent-primary`
    with a subtle scale/translate micro-animation on tap.
  - **Swipe-back gesture affordance:** sub-pages show a native-style back chevron top-left; support edge-swipe-to-go-back where the framework allows (or emulate with a gesture library).
  - **Pull-to-refresh** on list/dashboard screens.
  - **Haptics-style feedback:** use subtle scale-down (0.96) + opacity(0.85) on tap for all buttons/rows to emulate iOS touch feedback (works via CSS `:active`).
- **2-items-per-row rule (mandatory):** every grid of cards, stat tiles, quick actions, or
  list-style choices renders as a **2-column CSS grid** on mobile (`grid-template-columns:
  repeat(2, minmax(0,1fr)); gap: 12px;`). Only single-column: text-heavy forms, full-width
  hero banners, and detail rows inside an `IOSListGroup`.

### 2.3 Forms — iOS "grouped list" pattern everywhere
- Each logical section (Basic Details, Health, Residence, etc.) = one `GlassCard` acting as
  an iOS "inset grouped" list: a small uppercase section label above the card
  (`--text-secondary`, 13px, letter-spacing 0.5px), rows inside separated by 1px
  `--separator` hairlines, row height min 44px (iOS tap target), label left / value or input
  right-aligned, chevron `>` for rows that open a sub-sheet.
- Inputs are borderless, sit inside the row, right-aligned text, placeholder in
  `--text-tertiary`.
- Toggles use the `IOSSwitch` component (pill track, white knob, `--accent-success` when on).
- Pickers (Gender, Nationality, Relation Type, Acute Condition, Employment Type) open as an
  iOS-style **action sheet** (mobile) or **popover** (desktop), never a native `<select>`
  styled generically.

---

## 3. Component Rules

### 3.1 Buttons
- **Primary:** filled `--accent-primary`, white text, `14px` radius, height 50px, full-width
  on mobile forms, subtle inner highlight gradient (`linear-gradient(180deg, rgba(255,255,255,0.25), transparent)`) to mimic iOS button sheen.
- **Secondary/Glass:** `--glass-surface`, `--accent-primary` text, 1px `--glass-border`.
- **Destructive:** `--accent-danger` text on `--glass-surface` (iOS uses text-only red for
  destructive list actions, filled red only for confirmation-sheet buttons).
- **Floating Action Button (mobile):** 56px circle, `--glass-surface-strong`, blur, drop
  shadow, `+` icon, bottom-right, above tab bar.
- All buttons: `:active` → scale(0.97), 120ms ease-out.

### 3.2 Cards
- `GlassCard`: `--glass-surface`, `blur(20px) saturate(180%)`, `1px` border
  `--glass-border`, radius `20px`, shadow `--glass-shadow`, internal padding `16px`–`20px`.
- `StatCard` (dashboard KPIs): icon in a soft tinted circle (`accent` at 15% opacity),
  large number (Title 1), label (Footnote), optional trend chip.

### 3.3 Status & badges
- Active = green pill, Inactive/Locked = grey pill, Expiring soon = orange pill, Expired =
  red pill. Pills: `--glass-surface-subtle` background + accent-colored text/dot, radius
  `999px`, 12px/6px padding.

### 3.4 Navigation elements
- `TabBar` item: icon (24px, SF Symbols-style outline/filled pair — outline inactive, filled
  active), label 10px below.
- `LargeTitleHeader`: title 34px bold, subtitle optional 15px `--text-secondary`, right-side
  slot for an action icon button.

### 3.5 Sheets & Modals
- Mobile: slide up from bottom, rounded top corners `28px`, drag handle bar (36×5px, grey,
  centered) at top, `--glass-surface-strong`, backdrop dim `rgba(28,28,30,0.25)` with blur.
- Desktop: centered modal, radius `24px`, max-width 480–640px, same backdrop treatment.

### 3.6 QR / Printable Card
- The printable card preview itself should look like a physical translucent-glass ID card:
  rounded `20px`, subtle diagonal light-sheen gradient overlay, Profile Photo top-left, QR
  bottom-right, Profile ID in monospace-style numerals, brand color strip using
  `--accent-primary` → `--accent-secondary` gradient.

---

## 4. Motion

- Page transitions: iOS-style push/pop (slide in from right, previous page parallax-dims)
  on mobile; simple fade/scale (200ms) on desktop.
- Sheet present/dismiss: 280ms spring-ish ease (`cubic-bezier(0.32, 0.72, 0, 1)` — this is
  literally Apple's UIKit sheet curve).
- Respect `prefers-reduced-motion`: fall back to opacity-only transitions.

## 5. Accessibility & Quality Floor
- Minimum tap target 44×44px everywhere (iOS HIG).
- Color contrast: body text on glass must hit WCAG AA against the busiest background state
  (test glass over the brightest part of the gradient).
- Visible focus ring (`2px solid var(--accent-primary)`, offset 2px) for keyboard users even
  though the primary pattern is touch-first.
- All glass blur effects must have a solid-color fallback (`@supports not (backdrop-filter)`)
  using `--glass-surface` at higher opacity, since some browsers/webviews don't support blur.

## 6. Tailwind Config Snap (starting point)

```js
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: {
      base: '#F2F4F8',
      glass: {
        DEFAULT: 'rgba(255,255,255,0.55)',
        strong: 'rgba(255,255,255,0.72)',
        subtle: 'rgba(255,255,255,0.35)',
        border: 'rgba(255,255,255,0.6)',
      },
      accent: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        success: '#34C759',
        warning: '#FF9F0A',
        danger: '#FF3B30',
      },
      ink: {
        primary: '#1C1C1E',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
      },
    },
    borderRadius: { card: '20px', button: '14px', sheet: '28px' },
    backdropBlur: { glass: '20px', 'glass-strong': '30px' },
    boxShadow: {
      glass: '0 8px 32px rgba(31,41,55,0.10)',
      sheet: '0 16px 48px rgba(31,41,55,0.16)',
    },
  },
},
```

## 7. Do / Don't

**Do**
- Keep the ambient gradient background visible behind every screen at all times.
- Use 2-column grids for card collections on mobile.
- Reuse the same `GlassCard`/`IOSListGroup` primitives everywhere — profile forms, admin
  tables (as card-lists on mobile), payment history, printable preview.

**Don't**
- Never use a black, near-black, or fully-opaque dark panel as a page background.
- Don't mix a Material Design elevation/shadow style (sharp drop shadows, FABs with hard
  edges) into the same screen as the glass components — pick iOS HIG language everywhere.
- Don't default `<select>`/native browser pickers styling — always route through the custom
  ActionSheet/Popover picker component.
