# Segments & Services Roadmap — additions from 2026-08-26 session

Parked deliberately (roadmapped, not half-built). Participation figures below were
supplied by the user from NGF 2025 reporting; verify before print use.

## Segments to serve (market-sizing rationale)

| Segment | Signal (user-supplied, NGF-consistent) | What we ship |
|---|---|---|
| Women | 8.1M on-course 2025, up ~45% since 2019/20 | **Shipped:** Women's Golf — 6 Weeks program; women's benchmarks principle already in spec |
| Juniors & families | Junior participation up 58% since 2019 — largest of any age group | **Shipped:** Family Golf — 6 Weeks (parent enrolls, minors ride the parental-consent gate); doubles as summer camp / after-school block |
| Latent demand | 21.2M very interested but did not play in 2025 | **Shipped:** Your First 90 Days — 12-week beginner-conversion program |
| Off-course / short-course | 7M+ off-course-only; young-adult social golf 6.3M on-course | Program homework already routes to pitch-and-putts (Butler P&P is charted); simulator-lounge/league/night-golf partnerships parked |
| High-end independent pros & academy owners | $175–300/hr, packages, clinics, fittings, remote coaching | This IS the B2B license ICP — sales collateral should target them first |
| Directors of golf / club operators | Run tournaments, outings, retail, instruction, member/guest experience — often multiple facilities | Enterprise tier (Year 3 in the strategy): multi-pro, multi-facility licensing; tournaments/outings/retail stay THEIR business, we power the instruction layer |

## Services

- **Club fitting** — SUPPORTED TODAY: sell as a LessonProduct through the existing
  booking + Stripe-ready payments. Tom is fitting-certified (mytpi profile). Just add
  the product row.
- **Club rental subscriptions & beginner tee-time bundles** — partnership plays with
  courses/retailers, not code. Pairs naturally with First 90 Days (week-1 copy already
  normalizes rentals). Revisit when there's an audience to bring partners.
- **Corporate leagues** — on the site as an offering (priced per group, arranged directly); deliverable via Programs + scheduling machinery when the first company signs.
- **Group clinics / leagues / creator events** — deliverable through Programs +
  scheduling once there's demand; no new engineering to pilot one clinic.

## Market-condition plays (de-localized — tech-hub metro, hot summers, busy tee sheets)

- **Corporate tech-team leagues** — 6-8 week simulator/short-course seasons sold as team
  building; $2K-$8K per company season (founder estimate) + sponsor nights + F&B partners.
  Employer team discount live on site: 8+ colleagues on a work email = team rate, any
  company. NO third-party logos/badges — implies endorsement that doesn't exist.
- **Outing planner / concierge** — SHIPPED (v2): ranked charted courses per group type +
  heat-aware best-window scheduling on NWS data. Honest scope: no live tee-time inventory
  until course partnerships exist. Booking-fee/markup/commission model when they do.
- **Heat-proof formats** — dawn/twilight/indoor scheduling powered by the windows engine;
  partner with existing simulator venues before leasing space (metro guides list 11-17).
- **Mobile simulator events** — lean event business (parties, offsites, activations),
  $750-$2,500/event (founder estimate). Equipment/logistics risk; no lease.
- **Beginner starter kit** — fitting + used clubs + glove/balls + first lesson + first
  9-hole playing lesson, one price. Sellable today as a LessonProduct bundle.
- **Women's beginner community** — membership framing ($149-$299/mo founder estimate)
  around the shipped Women's 6-week program: clinics, simulator nights, 9-hole socials.
  National chapter orgs (e.g. LPGA Amateurs) prove league demand.
- **Junior/family subscription** — monthly per-kid framing around the shipped Family
  program; camps $400-$800/week (founder estimate).

## Turf AI (separate product line — do not fold into the golfer app)

Pixel-level turf condition from imagery + soil-moisture sensors; mow-timing and
grow-rate monitoring for superintendents. A B2B agtech vertical with hardware,
selling to course maintenance — different buyer, different product, different company
risk profile. Real anchor: Purdue's W.H. Daniel Turfgrass Research & Diagnostic
Center — a collaboration conversation, not a feature branch. Park until the core
coaching business is funded and running; revisit as a spin-off or partnership.

## Program tiers & packaging (2026-09-02 additions — build on existing programs, don't duplicate)

- **Beginner Bootcamp (4 wks)** — compressed First 90 Days: range + short game + etiquette + first 9. Same curriculum spine, faster cadence.
- **Women's Golf Social** — the shipped Women's 6-week + a weekly simulator night / 9-hole mixer. Community layer, not new curriculum.
- **Junior Pathway** — tier the Family program: beginner → intermediate → tournament-ready. Tournament tier waits for Tom's competitive input.
- **Corporate/Tech Golf Academy** — corporate leagues + etiquette module + simulator competition. Sales packaging of existing pieces.
- **Booking-management pain (validated)** — a local operator (atxgolf) reports tee-time/booking management is genuinely hard. Direct validation for the concierge roadmap: streamline booking/rebooking flows as the wedge, before any tee-time inventory partnerships.
