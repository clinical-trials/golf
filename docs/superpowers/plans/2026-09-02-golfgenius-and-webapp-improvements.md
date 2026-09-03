# GolfGenius review + webapp improvement plan

GolfGenius is the category leader for **golf event, league and tournament
management** (used by clubs, associations and coaches): registration, live
scoring/leaderboards, pairings, handicap/GHIN sync, mass communication,
TrackMan integration, golf-shop POS, and club microsites. This maps its
relevant capabilities to Pocket Pro (a single-pro business, not a whole club),
then lists broader improvements. Priorities: relevance to Tom-as-a-pro and to
students, not "does GolfGenius have it."

Legend: [have] already built · [extend] small lift on existing code · [build]
new · [integrate] needs a third party · [skip] not for a single pro.

## From GolfGenius — what's worth taking

1. **Events & leagues module** [extend, HIGH] — Corporate leagues, junior camps,
   family cups and clinics as managed *events*: registration, roster, schedule,
   standings. We already have Programs + enrollment + Stripe; add an "event"
   type (one-off or multi-week league with a standings table). Directly serves
   the corporate-league revenue line.
2. **Live scoring & leaderboards** [build, MEDIUM] — Real-time standings for
   leagues/clinics, fed by the round-logging we already have. Turns a corporate
   season into something people check on their phones.
3. **Communication / reminders** [build, HIGH] — Automated cohort and lesson
   reminders and league updates by email/SMS. This is a retention multiplier and
   pairs with the in-app Tom-messaging relay already roadmapped. (Twilio for SMS,
   an email service for the rest.)
4. **Handicap tracking / GHIN** [integrate, MEDIUM] — An official, trending
   handicap is powerful motivation and ties to the dashboard's progress story.
   GHIN needs club affiliation/authorization; start with our own internal
   handicap estimate from logged rounds, add official GHIN later.
5. **League formats & auto-pairings** [build, MEDIUM] — Skins, scramble,
   stableford, flighting, pairings. Needed once real leagues run; not before.
6. **TrackMan / launch-monitor ingestion** [integrate, MEDIUM] — Pull sim/range
   data into the player profile alongside video. Tom uses TrackMan; a partnership
   or file import feeds the diagnosis layer. Sequence after the biomechanics work.
7. **Event registration + fees** [have] — Our enrollment + checkout already cover
   this; GolfGenius's version is the same idea.
8. **Golf-shop / merch / gift cards** [extend, LOW-MED] — Gift cards exist; a
   light merch/apparel path ties to the sponsor-partners strip.
9. **Club microsites, on-course scorer app, pace-of-play, staff scheduling**
   [skip] — Club-scale features a single coach doesn't need. Our course tool +
   concierge already cover the on-course angle for a coach.

## Broader webapp improvements (beyond GolfGenius)

- **Student accounts + real dashboard** [build, HIGH] — the mockup exists; wire it
  to the accounts/enrollment/progress the backend implements. The retention core.
- **Automated progress reports** [build] — a monthly "here's how your game moved"
  email from benchmark + round data. Word-of-mouth engine.
- **Reviews / testimonials** [build, later] — real student before/after, once they
  exist. Never fabricated.
- **Content / SEO** [build] — Tom's tips and per-course notes as indexed pages;
  the course directory is a natural SEO surface (every course = a landing page).
- **Referrals & gift cards** [have] — live in the demo; go real with Stripe.
- **Accessibility + performance pass** [extend] — alt text, focus states,
  responsive images (started); keep tightening.
- **Analytics** [build] — privacy-respecting product analytics so decisions use
  data, not guesses.

## Recommended sequence (once payments are live)

1. Wire the student dashboard to real accounts. (retention)
2. Communication/reminders (email + SMS). (retention)
3. Events & leagues module + live standings. (corporate revenue)
4. Internal handicap → GHIN later; TrackMan ingestion alongside the biomechanics layer.

## The honest constants

- The diagnosis/biomechanics moat stays gated on Tom's method capture.
- Nothing fabricated: leaderboards, handicaps and reports all run on real logged
  data, or they don't ship.
- Integrations (GHIN, TrackMan, SMS) need accounts/authorization only the business
  can grant — I can build the code and hand you the exact connect steps.
