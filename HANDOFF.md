# Pocket Pro — developer handoff

A golf coaching platform for PGA Professional **Tom Harris**. Two surfaces in one repo:

1. **Live marketing + preview site** — static HTML in `docs/`, served on GitHub Pages.
   Near launch; go-live is mostly pasting real values into config objects (see below).
2. **Application backend** — Next.js 15 App Router + Prisma 7 + PostgreSQL, under
   `src/` and `prisma/`. Real, tested, not yet deployed.

> Fastest start: get added to the GitHub repo **`clinical-trials/golf`** instead of
> working from this zip — you get history, branches, and PRs. This zip is a clean
> source snapshot (no `node_modules`, no secrets, no private media).

## Branch model (important)

- **`version-4-final-draft`** — the ACTIVE branch. Push here.
- **`version-3`** — frozen minimal site, kept as a roll-back fallback. Don't touch.
- **GitHub Pages currently serves `version-3`.** Until Pages is repointed in repo
  Settings, the live `clinical-trials.github.io/golf` URL reflects v3; preview v4 via
  githack.
- `version-2` — the earlier FULL-featured site, kept as an add-back demo.
- `main` — fallback.

## Prerequisites

- Node 20+, **pnpm** (`corepack enable`), PostgreSQL 16.

## Setup

```bash
pnpm install
cp .env.example .env                 # set DATABASE_URL to your local Postgres
createdb golf_dev                    # or point DATABASE_URL at any Postgres
pnpm exec prisma db push             # creates the schema (no migrations dir)
pnpm exec vitest run                 # 116 tests should pass
```

### Build notes (TypeScript / Next)

- **Resolved 2026-11-17:** TypeScript is pinned to `^6` (Next 15 cannot compile
  with TS 7), and `next.config.mjs` marks the optional lazy adapters
  (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `stripe`) as webpack
  externals so the build doesn't try to bundle packages that are only installed
  when those integrations go live. **`next dev` boots and compiles.**
- **Remaining, known:** `next build`'s type-check phase surfaces ~23 pre-existing
  type errors — this project was only ever checked by esbuild (Vitest), never
  `tsc`. `pnpm exec tsc --noEmit` lists them. Clean them up before production
  builds (or set `typescript.ignoreBuildErrors` in next.config.mjs as a
  documented stopgap).
- After a fresh `pnpm install`, run `pnpm exec prisma generate` — pnpm skips
  Prisma's postinstall script (`prisma db push` also regenerates).
- `scripts/dev-api.ts` (a tsx harness) can still serve the route handlers over
  HTTP without Next if ever useful: `DEV_AUTH=1 pnpm exec tsx scripts/dev-api.ts`.

## Architecture

- **`src/domain/*`** — business logic, framework-free. External services sit behind
  **ports** (see `src/domain/payments/port.ts` + `StubPayments`/`StripePayments`,
  selected by `STRIPE_SECRET_KEY`). Follow this pattern for email/SMS.
- **`src/app/api/*`** — thin route handlers that call the domain layer.
- **`prisma/schema.prisma`** — data model; `prisma db push` workflow (no migrations).
- **Tests share one database**; every test resets it via `tests/reset.ts` (FK-safe
  order — add new models there).
- **`docs/`** — the static site. `docs/dashboard.html` already progressively fetches
  real data from `GET /api/dashboard` when a backend + session are configured.

## What's built (real + tested, 116 tests)

Consent/waivers · player model · video combine (capture) · scheduling/availability ·
payments (Stub + Stripe ports) · class programs (flipped classroom, server-scored
quizzes) · rounds + scorecard · weather (NWS) · concierge · **student dashboard
read-model + hashed opaque sessions** (`src/domain/dashboard`, `src/domain/auth`,
`GET /api/dashboard`) · **calendar invites** (`src/domain/calendar/invite.ts`:
Google links + RFC 5545 .ics; the dashboard's "add to calendar," and the same
.ics that email reminders will attach).

## What's pending (the roadmap)

1. **Comms/reminders** — email + SMS behind a port (mirror the payments port).
   This also unlocks **magic-link login**: the seam is the dev-gated
   `POST /api/auth/session` (`src/app/api/auth/session/route.ts`) — swap dev issuance
   for a one-time emailed token → session exchange.
2. **Events & leagues + live standings** (corporate revenue line).
3. **Handicap/GHIN + TrackMan ingestion**, alongside the proprietary biomechanics layer.

Plans live in `docs/superpowers/plans/`.

## Go-live checklist for the static site

End of `docs/index.html` has config objects to fill — blank = honest "connected at
launch" placeholder:

- `window.STRIPE_LINKS` — per-product checkout URLs. **Four of seven are
  connected (2026-11-18)** to Tom's CoachNow Packages page (`COACHNOW_PACKAGES`),
  where the listings are live and paid via Stripe: "Cheat Sheet for Reminders"
  $9.99, "Individual Session" $69, "Monthly Coaching" $250/mo and "Full-Time
  Coaching" $400/mo (both subscriptions carry a 3-month minimum, now stated on
  the site cards). CoachNow has no per-package URL, so each button opens the
  Packages page and the card names the listing to pick. **Still blank:**
  `six-session-series` ($89), `self-guided-course` ($250) and the two hats —
  none of those exist on CoachNow yet.
- `window.FORMS` — newsletter/shop (Mailchimp embedded-form action URL) + contact
  (Formspree endpoint or `mailto:`).
- `window.ATLAS_URL` — First Tee Atlas (already live at `/golf/atlas/`).
- `window.STICKER_SHOP_URL` — Shopify/design link for the sticker series; blank
  keeps the "See the sticker designs" button hidden.
- `window.BLACK_FRIDAY` — sale window (`from`/`through`, inclusive) + `offer` text.
  Drives the hero chip and the box in The 19th Hole panel; see below.
- LocalBusiness JSON-LD in `<head>` — Tom's real business address, phone, hours.
- Analytics — a Plausible or GA account.

### Added 2026-11-18 (static site, on `version-4-final-draft` only)

- **The 19th Hole** — a footer-opened `<dialog>` like the other side panels: a
  rotating golf-joke card (`JOKES` array next to the config objects), a copy
  button, a Club Bites nudge, and Tom's sticker series. The sticker list is
  authored once in the Pro shop panel (`#shop-dialog .stick-grid`) and mirrored
  into this panel by script — edit it there.
- **Footer joke line** — one random joke setup per page load; it opens the panel
  on that joke.
- **Black Friday sale, Wed Nov 25 – Tue Dec 1, 2026.** A chip under the hero
  buttons and a box in the panel read "starts Wed, Nov 25" before the sale, "on
  now through Dec 1" during it, and remove themselves on Dec 2. No discount
  amounts are published: the link opens an email to Tom with the subject "Black
  Friday pricing", which is deliberate — it shows who responds to a sale.
  **Time-sensitive:** Pages still serves `version-3`, so none of this is public
  until Pages is repointed (or v3 is fast-forwarded) — and Tom reviews the copy.

### Delegate to-do — added 2026-11-18

- [ ] **TOP PRIORITY — do this first:** a privacy item for Tom's third-party
  profiles. The details are in `START-HERE.txt` in the private handoff package
  (kept out of this public repo on purpose). Ask the owner if you don't have it.
- [ ] **Before Wed Nov 25:** get Tom's review of the Black Friday copy, then
  repoint GitHub Pages to `version-4-final-draft` (or fast-forward `version-3`)
  so the sale notice is actually public.
- [ ] **Fix the "Latest video" feed** — see the known issue below.

### Known issue (found 2026-11-18)

- **"Latest video" no longer refreshes from YouTube.** The page reads Tom's
  channel RSS through two public CORS proxies; both now fail (corsproxy.io
  returns 401, allorigins.win returns 522). The tab still shows a video because
  it falls back to `docs/videos.json`, but that file was seeded 2026-10-15 and
  nothing regenerates it, so new uploads don't appear. Fix: regenerate
  `videos.json` on a schedule (a GitHub Actions cron only runs from the default
  branch, `main`) or put the RSS behind a small serverless endpoint.

## Constraints the delegate MUST honor (non-negotiable)

- **Nothing fabricated.** Data, testimonials, stats, imagery are real or clearly
  labeled sample/preview. Empty states over invented ones.
- **We do not sell golfer data.**
- **All class curricula are DRAFT pending Tom Harris's review** — nothing goes out
  under his name unreviewed.
- **No third-party logos** — company names as text only. (The PGA Member seal is
  authorized because Tom provided the asset.)
- **Real-student swing media stays private** — `docs/media/` is gitignored and must
  never be published to the public site; use anonymized ("Jordan") stand-ins.
- **The $10 Student Cheat Sheet PDFs are a paid product** — they live OFF-repo
  (`~/Downloads/`), are never committed, and are delivered only after payment.

## Owner still needs to provide / decide (blocks the pending work)

- Hosting: a Postgres host (Neon/Supabase/Vercel) + app host (Vercel) + who owns them.
- Email provider (Resend/Postmark/SendGrid) and SMS provider (Twilio) — gate comms +
  magic-link.
- Domain, Stripe account (live keys), Tom's real booking/contact value + curriculum
  sign-off.
