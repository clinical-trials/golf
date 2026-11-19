# Pocket Pro — developer handoff

A golf coaching platform for PGA Professional **Tom Harris**. Two surfaces in one repo:

1. **Live marketing + preview site** — static HTML in `docs/`, served on GitHub Pages.
   Near launch; go-live is mostly pasting real values into config objects (see below).
2. **Application backend** — Next.js 15 App Router + Prisma 7 + PostgreSQL, under
   `src/` and `prisma/`. Real, tested, not yet deployed.

> Fastest start: get added to the GitHub repo **`clinical-trials/golf`** instead of
> working from this zip — you get history, branches, and PRs. This zip is a clean
> source snapshot (no `node_modules`, no secrets, no private media).

## Branch model — the toggle map (important)

Every branch carries the same static site in `docs/`, so toggling between eras is
just `git switch <branch>` and open `docs/index.html` (or use GitHub's branch
picker on the web).

- **`v5-nov-18-2026`** — the WORKING branch: ideas and improvements from
  Nov 18, 2026 forward (branched from `version-4-final-draft` that day).
  New work goes here.
- **`version-4-final-draft`** — the LIVE site: **GitHub Pages serves this branch**
  at clinical-trials.github.io/golf/. Merge v5 work here only when it's ready to
  go live. A bot commits `docs/videos.json` here — always pull before pushing.
- **`version-3`** — the original minimal page, frozen as a roll-back fallback.
  Don't touch.
- **`version-2`** — the legacy FULL-featured site, the richest feature demo and
  add-back reference (plus snapshots `version-2-legacy`, `version-2-sept-8`).
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

- `window.STRIPE_LINKS` — per-product checkout URLs. **Six of the seven paid
  teaching offerings are connected (2026-11-19)** to Tom's CoachNow Packages
  page (`COACHNOW_PACKAGES`), where the listings are live and paid via Stripe:
  "Cheat Sheet for Reminders" $9.99, "Individual Session" $69, "TPI Physical
  and Swing Assessment" $149 (card added 2026-11-19), "From 'I'm Interested to
  I'm a Golfer' Series" $89, "Monthly Coaching" $250/mo and "Full-Time
  Coaching" $400/mo (both subscriptions carry a 3-month minimum, now stated on
  the site cards). CoachNow has no per-package URL, so each button opens the
  Packages page and the card names the listing to pick. **Still blank:**
  `self-guided-course` ($250) and the two hats — neither exists on CoachNow.
  Also on CoachNow but not on the site (checked 2026-11-19): under Private
  Sessions, a free 30-minute "Introductory session" (owner hasn't decided
  whether to add a card). Tom edits these listings himself, so re-check names
  and prices before relying on this list.
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
- **Red Black Friday bar** at the very top (`#bf-bar`), driven by the same
  `window.BLACK_FRIDAY` dates; it links to `COACHNOW_PACKAGES`. The sale prices
  themselves have to be set by Tom on CoachNow — the site publishes none.
- **Mobile comfort stylesheet** — the last `<style>` block in the page gives
  44px tap targets on small or touch screens. Keep it last so it wins.
- **Images** — video thumbnails use YouTube's 640/1280px files through `srcset`
  (with a fallback for videos that have no large thumbnail); the clinic photo
  has a 2000px variant for large screens. EXIF/XMP metadata was stripped
  losslessly from the site and Atlas JPEGs; strip it from any new photo before
  committing (six rotation-dependent photos in `docs/img` still carry a
  device/date tag and would need re-encoding to remove it).
- **Black Friday sale, Wed Nov 25 – Tue Dec 1, 2026.** A chip under the hero
  buttons and a box in the panel read "starts Wed, Nov 25" before the sale, "on
  now through Dec 1" during it, and remove themselves on Dec 2. No discount
  amounts are published: the link opens an email to Tom with the subject "Black
  Friday pricing", which is deliberate — it shows who responds to a sale.
  **This is public as of 2026-11-18** (Pages serves `version-4-final-draft`) and
  still needs Tom's review — see the delegate to-do list.

### Delegate to-do — added 2026-11-18

- [ ] **TOP PRIORITY — do this first:** a privacy item for Tom's third-party
  profiles. The details are in `START-HERE.txt` in the private handoff package
  (kept out of this public repo on purpose). Ask the owner if you don't have it.
- [ ] **Before Wed Nov 25 — Black Friday is already public.** Pages now serves
  `version-4-final-draft`, so the red bar, the hero chip and the sale notice are
  live and currently read "starts Wed, Nov 25". Two things are still owed:
  (1) Tom reviews the sale copy and the 19th Hole jokes, which went live
  unreviewed; (2) Tom sets the sale prices on CoachNow — the red bar sends
  buyers to his Packages page, where prices are still the regular ones.
- [ ] **Ask Tom for larger originals of three photos** — the hero
  (`tom-harris-lesson.jpg`), the pink-shirt photo (`lesson-tee.jpg`) and the
  range photo (`tom-harris-range.jpg`). They are slightly soft on large retina
  screens; 2000px or more on the long side fixes it. Strip metadata before
  committing, and add a `srcset` the way the clinic photo does.
- [ ] **Connect the last buy buttons** when their checkout exists: the $250
  Self-Guided Course and the two hats (see `window.STRIPE_LINKS`). The $89
  series was connected 2026-11-18; the $149 TPI assessment card was added and
  connected 2026-11-19.
- [x] **Fix the "Latest video" feed** — fixed 2026-11-18, see below.
- [x] **Repoint GitHub Pages to `version-4-final-draft`** — done 2026-11-18.

### "Latest video" feed — fixed 2026-11-18

The Courses section's "Latest video" tab shows Tom's newest YouTube upload and
now keeps itself current. No API key, no paid service, no third-party proxy.

- **How it works.** `scripts/update-videos.mjs` fetches the channel's public
  feed and rewrites `docs/videos.json` (same `{"videos":[{"id","title"}]}`
  shape, newest first). `.github/workflows/update-videos.yml` runs it and
  commits to `version-4-final-draft` as `github-actions[bot]`, only when the
  list changed. The page reads `videos.json` from its own origin, shows the
  first entry (`vids.slice(0,1)`), and hides it once this browser has played it
  (`pp_latest_viewed` in localStorage). There is no hardcoded video any more;
  if `videos.json` can't be read the tab links to Tom's channel instead.
- **What had broken.** The page fetched the feed in the browser through two
  free CORS proxies, and both died (corsproxy.io 401, allorigins.win 522);
  `videos.json` was only a fallback, seeded once on 2026-10-15. Don't go back
  to public proxies: of four others tried on 2026-11-18, three were down too.
- **Verified 2026-11-18:** pushing the workflow ran it (it also runs on any
  push that changes the script or the workflow), and the bot's commit
  `60349ff` brought `videos.json` from six uploads behind to current.
- **The workflow file lives on two branches, on purpose.** GitHub runs
  `schedule`, and shows the "Run workflow" button, only for workflow files on
  the default branch (`main`), so an unchanged copy was added there on
  2026-11-18 (commit `113a494`). It always checks out `TARGET_BRANCH`, so
  nothing else on `main` matters. When you change the workflow, change it on
  `version-4-final-draft` and copy it to `main` again. If the default branch
  ever changes, the copy already on `version-4-final-draft` takes over. To
  refresh by hand at any time: `node scripts/update-videos.mjs`, then commit
  `docs/videos.json`.
- **`TARGET_BRANCH` in the workflow must be the branch GitHub Pages builds
  from** — `version-4-final-draft` (as of 2026-11-18 the Actions tab shows
  "pages build and deployment" running on it). Change it in both copies if
  Pages is ever pointed elsewhere.
- **Pull before you push.** The bot commits whenever Tom uploads (roughly
  weekly). If your push is rejected, `git pull --rebase` and push again.
- **If the tab goes stale:** Actions tab → "Update latest videos". A failed run
  leaves the last good `videos.json` in place. GitHub also switches scheduled
  workflows off after 60 days without repository activity; re-enable it there.
- Tests: `pnpm exec vitest run tests/scripts/update-videos.test.ts` (no
  database needed).

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
