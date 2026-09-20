# Seed & Plate — PWA

Premium D2C farm-to-desk app for the Wai → Pune/Juinagar supply chain.
See `CORE_IDEA.md` for the business model and `docs-backend/API_CONTRACTS.md` for the REST contract.

## Stack
React 19 · Vite 8 · Tailwind 4 · React Router 7 · TanStack Query 5 · Motion · vite-plugin-pwa

## Getting started
```bash
npm install
cp .env.example .env
npm run dev
```

The app runs against a built-in mock API by default (`VITE_USE_MOCKS=true`), so no backend is needed.

Sign in with any 10-digit number. `9000000001` is a seeded customer with live reservations;
`9000000099` is the admin and unlocks `/admin`.

## The pricing model

A stored batch is **released in tranches**, not sold at one price. Each tranche is priced on the
day it leaves the farm store, so a batch sold over six weeks can carry three different prices.

> **Your price is the price on the day your kilos leave the farm store.**

- Everyone inside a tranche pays the same rate; **strict FIFO** decides who lands in which one.
- A **price band** (`estimatedPriceLowPerKg`–`estimatedPriceHighPerKg`) is quoted at reserve time.
- The band ceiling is binding: release above it and those reservations are **cancelled free**
  rather than billed.
- **Shrinkage is ours.** The farm is paid on weighed-in weight; storage loss is recovered through
  the carry term in the price formula.
- **Delivery is baked into ₹/kg.** The receipt is always `qty × ₹/kg`, with no extra lines.

The formula behind the admin's suggested price lives in `src/lib/pricing.js`:

```
retail = mandiRate × shrinkageMultiplier × premium + storageCarry + pack + logistics
```

## Environment
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API prefix, defaults to `/api/v1` |
| `VITE_USE_MOCKS` | `true` routes all calls to `src/mocks/server.js` |
| `VITE_DEV_API_PROXY` | Spring Boot origin the Vite dev server proxies `/api` to |

To point at the real backend: set `VITE_USE_MOCKS=false` and `VITE_DEV_API_PROXY` to the Spring Boot URL.

## Structure
```
src/
  api/         one module per API_CONTRACTS.md area
  app/         router, shell, providers, error boundary
  components/  shared UI kit (Button, Card, PriceBandBar, ConfirmSheet…)
  features/
    auth/      phone-number identity, route guards
    feed/      live farm feed + batch story
    waitlist/  quantity slider, reserve flow
    dashboard/ My Harvests, cancel flow
    checkout/  receipt, Razorpay hand-off, payment return polling
    pricing/   the public "How we price" page
    admin/     batches, tranche release, Smart Manifest
  lib/         api client, enums, pricing engine, formatting helpers
  mocks/       in-memory backend used until the real one is hosted
```

## Routes
| Route | Who |
|---|---|
| `/` · `/crops/:id` · `/how-we-price` · `/sign-in` | public |
| `/crops/:id/reserve` · `/harvests` · `/checkout/:id` · `/checkout/:id/return` | signed in |
| `/admin` · `/admin/batches/:id` · `/admin/batches/:id/release` · `/admin/manifest` | admin |

## Notes for whoever touches the CSS
`src/index.css` declares explicit `@source` globs. Tailwind v4's automatic source detection fails
in this project (no git repo) and silently emits a stylesheet with tokens but **no utility
classes** — the app renders unstyled in dev while the build looks fine. Leave those lines in.

## Scripts
`npm run dev` · `npm run build` · `npm run preview` · `npm run lint`
