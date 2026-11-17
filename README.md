# golf

**One coach. One method. Every course on earth.**

A golf coaching platform built around a single PGA Master Professional's method, delivered
by software trained exclusively on *his* system and voice, with him in the loop wherever
judgment is required.

Two surfaces, one brain:

- **The Pocket Instructor** — diagnoses your swing from video, prescribes work in his
  method, retests you, and tracks whether anything actually moved.
- **The On-Demand Pro** — knows the hole in front of you *and* knows you miss right with
  driver under pressure, and tells you what he would tell you.

Neither half is novel alone. The join is the product.

## Status

Active build — two surfaces exist.

- **Marketing + preview site** — static, in [docs/](docs/), served on GitHub Pages
  (currently from `version-3`; active work is on `version-4-final-draft`). Near launch:
  go-live is pasting real Stripe Payment Links, form endpoints, and Tom's business details
  into the config objects at the end of [docs/index.html](docs/index.html).
- **Application backend** — Next.js 15 + Prisma 7 + PostgreSQL under [src/](src/) and
  [prisma/](prisma/). Real and tested (**116 tests**, `pnpm exec vitest run`); not yet
  deployed. Built so far: consent/waivers, player model, video combine, scheduling,
  payments (Stub + Stripe ports), class programs (flipped classroom), rounds, weather,
  concierge, and the student dashboard read-model + hashed sessions, with "add to
  calendar" (.ics + Google) for bookings. Pending: comms/reminders + magic-link login,
  events & leagues, handicap/TrackMan + the biomechanics layer.

**New to this repo? Start with [HANDOFF.md](HANDOFF.md)** — setup, the branch model, the
TypeScript/Next build note, what's built vs. pending, the go-live checklist, and the
non-negotiable constraints (nothing fabricated; curricula draft pending Tom's review;
private student media; paid digital products).

- **Design spec:** [docs/superpowers/specs/2026-08-22-golf-coaching-platform-design.md](docs/superpowers/specs/2026-08-22-golf-coaching-platform-design.md)
- **Plans & roadmaps:** [docs/superpowers/plans/](docs/superpowers/plans/)

## Shape

Multi-tenant platform, first tenant super-customized. Pro-specific elements — fault
taxonomy, drill library, prescription rules, archetype variants, voice — live in a swappable
per-tenant layer. The global course model is shared, so a second pro inherits worldwide
course coverage on signup.

## Critical path

Method extraction comes first, and it is not code: structured interviews with the pro,
converted into the fault taxonomy, drill library, archetype definitions, prescription
decision rules, and a pro-labeled golden evaluation set.

## Open items

Credential verification, satellite imagery licensing, ODbL review of OSM-derived course
data, and attorney review of all waivers and consent language. See Section 13 of the spec.
