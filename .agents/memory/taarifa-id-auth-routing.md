---
name: TAARIFA_ID auth routing fix
description: next-auth /api/auth/* was intercepted by the api-server artifact; fix is to claim /api/auth path in taarifa-id artifact.toml
---

# Auth Routing Conflict — TAARIFA_ID

## The rule
The api-server artifact owns `/api`. next-auth in the taarifa-id Next.js app serves `/api/auth/*`. Path-based routing sent auth calls to the api-server (404) instead of Next.js.

**Fix:** add `/api/auth` as an explicit path in the taarifa-id `artifact.toml` service paths array. More specific paths win.

```toml
[[services]]
name = "web"
paths = [ "/", "/api/auth" ]
localPort = 21711
```

**Why:** Replit path-based router gives priority to the more specific prefix. `/api/auth` beats `/api` so auth calls reach Next.js, not the api-server.

**How to apply:** Any time a Next.js artifact sits behind an api-server artifact that claims `/api`, add any Next.js internal API prefixes (e.g. `/api/auth`, `/_next`) as explicit paths on the Next.js service.

## Also required
- `AUTH_SECRET` must be set as a Replit Secret for next-auth to function.
- Background: CSS `background` shorthand (in `.hero-bg`) is overridden by a sibling class setting `background-image` (`.hero-grid`) — keep all background layers in a single declaration or use `background-color` + pseudo-element instead.
