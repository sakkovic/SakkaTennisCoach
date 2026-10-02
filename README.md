# Sami Sakka — Private Tennis Coach

Premium coaching website with online lesson booking and a coach dashboard.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS) · Zod · React Hook Form · Motion

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No setup needed to try it:** without Supabase keys the app runs in
**demo mode** — an in-memory database with sample lessons, locations, hours and bookings.
The dashboard is at http://localhost:3000/admin ("Enter demo dashboard"). Demo data resets when
the dev server restarts. Demo mode is disabled in production builds.

## Connect Supabase (production)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run every file in `supabase/migrations/` **in filename order**, then `supabase/seed.sql`
   (or `supabase db push` with the Supabase CLI, then the seed).
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API).
4. **Create the coach account:** Authentication → Users → *Add user* (email + password). Then in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'coach@example.com');
   ```
5. In Authentication → Providers, you can disable public sign-ups (players never need accounts).
6. Restart `npm run dev` and sign in at `/admin`.

### Email notifications (optional)

Set `RESEND_API_KEY`, `EMAIL_FROM` (a verified domain in Resend) and optionally
`COACH_NOTIFICATION_EMAIL`. Without a key, emails are only logged — booking never fails because of email.

Emails sent: request received (player), new request (coach), confirmed (player), cancelled (player), contact message (coach).

## Editing content

| What | Where |
| --- | --- |
| Name, phone, WhatsApp, email, Instagram, city / SEO area, timezone | `config/site.ts` |
| Navigation & CTAs | `config/nav.ts` |
| Credentials, hero qualification line, statistics (hidden while `null`) | `content/credentials.ts` |
| Focus areas, player levels, "why train", philosophy, methodology | `content/coaching.ts` |
| About page copy | `content/about.ts` |
| Photos (currently Unsplash placeholders) | `content/images.ts` → put files in `public/images/` |
| **Lesson types & prices, locations, weekly hours, blocked dates, booking rules** | **Admin dashboard** (database) |

Items marked `TODO` in `config/` and `content/` are placeholders waiting for real information.

## How booking works

```
Lesson → Location → Date & time → Your details → Review & confirm → /booking/success
```

- **No player accounts.** Details are validated with the same Zod schema on client and server;
  a draft is kept in `sessionStorage` (never in the URL).
- **Step state lives in the URL** (`/booking?service=private-lesson&location=…&date=…&time=…&step=…`),
  so the back button works and links like `/booking?service=private-lesson` deep-link into the flow.
- **Availability** = weekly rules − blocked dates − pending/confirmed bookings (±buffer) − minimum
  notice, limited to the booking window. Computed in Postgres (`get_available_slots`).
  `lib/booking/slots.ts` is the unit-tested TypeScript reference used by demo mode.
- **Double booking is impossible:** `create_booking()` takes a per-day advisory lock, re-validates
  the slot, and the `bookings_no_overlap` exclusion constraint rejects any overlap as a last line of defence.
  One coach = no overlap across *all* locations.
- **Security:** the public never reads the `bookings` table (RLS). It can only call
  `get_available_slots`, `get_available_dates`, `create_booking` and `get_booking_summary` (no personal data).
  Admin access requires `profiles.role = 'admin'`, checked in the proxy, the admin layout, every Server Action, and by RLS.
- **Anti-spam:** honeypot field + max pending requests per email per 24h (setting).
- **Payment-ready:** each booking snapshots price/currency/duration and has `payment_status`;
  a `payments` table exists for a future Stripe integration.

## Project structure

```
app/
  (site)/            public pages: home, about, coaching, booking (+success), contact, privacy
  admin/login        sign-in (Supabase Auth, or demo)
  admin/(dashboard)/ dashboard, bookings (+[id]), calendar, availability, services, locations, messages, settings
  api/availability   JSON slots/dates for the booking calendar
  sitemap.ts · robots.ts · opengraph-image.tsx · icon.svg
actions/             Server Actions (booking, contact, auth, admin)
components/          ui/ · layout/ · home/ · booking/ · coaching/ · contact/ · admin/
config/ · content/   business info and editorial content
lib/
  booking/           domain types, slot engine (+tests), time & money helpers
  data/              repository interface + Supabase and demo implementations
  supabase/          server client + session refresh for the proxy
  validation/        Zod schemas
  notifications/     email (Resend REST)
  seo/               metadata + JSON-LD
proxy.ts             optimistic /admin guard (Next 16 "proxy", formerly middleware)
supabase/            migrations, seed, database tests (PGlite)
```

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm test` | Slot engine unit tests (Vitest) |
| `npm run test:db` | Runs the real migration + seed on PGlite and tests slots, double-booking, blocks, rate limiting and RLS |
| `npm run check` | Lint + typecheck + all tests |

## Design system ("Baseline")

Tokens are defined in `app/globals.css` (`@theme`). Navy `ink #071C2C` / `navy #0B2D46`,
tennis `lime #D7F530` (accent only — never text on white; use `lime-ink #5C6E00`),
`muted #5B6B78` on light and `muted-dark #8A98A5` on dark (both ≥ 4.5:1).
Bebas Neue for display headings, Inter for everything else. Radius 12 / 20 / 24 px.
Brand motif: regulation court lines (`components/ui/CourtLines.tsx`) and the lime seam curve.
Motion is subtle and respects `prefers-reduced-motion`.

## Roadmap

- Real photos, credentials wording, contact details, city/timezone/currency (see `TODO`s)
- Stripe deposits / payment at booking (tables and snapshots already in place)
- Player accounts: lesson history, packages, self-service cancellation (`bookings.player_id` ready)
- Gallery & testimonials pages, Instagram feed API, multi-language
