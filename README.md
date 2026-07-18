# Nail Visual

**Two-sided marketplace connecting clients with nail artists** — design discovery and booking in 3–4 taps.

> Founded and built as a solo MVP, owning product, architecture, frontend, and backend end-to-end.

**Live:** [nail-visual.vercel.app](https://nail-visual.vercel.app) · **Code:** [github.com/alpknx/nail-visual](https://github.com/alpknx/nail-visual)

---

## What it does

Nail Visual compresses a typically fragmented discovery-and-booking flow into a minimal, mobile-first experience:

- **Clients** browse artist portfolios, filter by style, and book appointments in 3–4 taps
- **Nail artists** manage their portfolio, set availability, and receive bookings
- Role-based access (client / artist) enforced end-to-end: server actions, middleware route gating, and UI
- Timezone-aware availability/booking engine (working hours, one-off overrides, race-condition-safe slot booking)
- Localized in English, Polish, and Russian (next-intl)
- Analytics via PostHog; image uploads via UploadThing

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Server Components, Turbopack) |
| UI | React 19 · shadcn/ui · Tailwind CSS v4 · Radix UI |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod v4 |
| ORM / DB | Drizzle ORM + PostgreSQL |
| Auth | NextAuth v4 (role-based, Drizzle adapter) |
| i18n | next-intl |
| Uploads | UploadThing |
| Deploy | Vercel |

## Getting Started

```bash
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_SECRET, etc.
docker compose up -d         # local Postgres + PostGIS
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Database commands:

```bash
pnpm db:studio    # Drizzle Studio
pnpm db:fresh     # reset + migrate + seed
```

## Testing

```bash
pnpm exec playwright test   # e2e (registration, sign-in, role-gated routing)
```

CI (`.github/workflows/ci.yml`) runs lint + build on every push/PR, plus the
e2e suite against a disposable Postgres/PostGIS service container.
