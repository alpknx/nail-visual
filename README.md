# Nail Visual

**Two-sided marketplace connecting clients with nail artists** — design discovery and booking in 3–4 taps.

> Founded and built as a solo MVP, owning product, architecture, frontend, and backend end-to-end.

**Live:** [nail-visual-alpknxs-projects.vercel.app](https://nail-visual-alpknxs-projects.vercel.app) · **Code:** [github.com/alpknx/nail-visual](https://github.com/alpknx/nail-visual)

---

## What it does

Nail Visual compresses a typically fragmented discovery-and-booking flow into a minimal, mobile-first experience:

- **Clients** browse artist portfolios, filter by style, and book appointments in 3–4 taps — no account required
- **Guests** can book without signing up (name + optional phone) and confirm via a Telegram bot instead of email
- **Nail artists** manage their portfolio, set weekly working hours and one-off time off, and run their booking calendar from a mobile-first dashboard
- Role-based access (client / artist) enforced end-to-end: server actions, middleware route gating, and UI
- Timezone-aware availability/booking engine (working hours, one-off overrides, race-condition-safe slot booking that correctly excludes overlapping bookings)
- Tag-based "Similar Works" matching surfaces other artists whose portfolio overlaps with what a client is viewing
- Post-session ratings and reviews (via the Telegram bot for guests, in-app for signed-in clients) shown on each artist's public profile
- Localized in English, Polish, and Russian (next-intl)
- Analytics via PostHog; error monitoring via Sentry; image uploads via UploadThing

### Telegram bot integration

Guest bookings are confirmed through a Telegram bot instead of email:

1. Guest books with just a name (no account, no email) → gets a one-tap deep link to the bot
2. Bot shows the booking details with inline **Confirm** / **Cancel** buttons; Confirm flags the booking as guest-confirmed (visible to the artist in their calendar) — the artist still confirms/cancels manually as the final word. Cancel lets the guest call off the appointment themselves, right from the chat
3. If the artist cancels instead, the guest is notified in the same chat
4. After the appointment (or on cancellation), the bot asks for a 1–5 star rating and an optional comment, which becomes a public review on the artist's profile

Webhook: `POST /api/telegram/webhook` · session-completion sweep: `GET /api/cron/session-followup` (daily, Vercel Cron).

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Server Components, Turbopack) |
| UI | React 19 · Konsta UI (mobile) · shadcn/ui · Tailwind CSS v4 · Radix UI |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod v4 |
| ORM / DB | Drizzle ORM + PostgreSQL (Neon), PostGIS for geo |
| Auth | NextAuth v4 (JWT sessions, role-based, Credentials provider) |
| Notifications | Telegram Bot API (guest booking confirmation, cancellations, reviews) |
| Rate limiting | Upstash Redis (sliding window), in-memory fallback when unset |
| Monitoring | Sentry (errors), PostHog (product analytics) |
| i18n | next-intl (en / pl / ru) |
| Uploads | UploadThing |
| Testing | Playwright (e2e) |
| Deploy | Vercel (Cron Jobs for scheduled follow-ups) |

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
