# Golf Coaching Platform — Design Spec

**Date:** 2026-08-22
**Status:** Design approved in principle; open items listed at the end
**Repo:** `clinical-trials/golf`

---

## 1. Problem

Golf instruction has a structural gap that no existing product closes.

A lesson lasts 45 minutes and happens every two to four weeks. The hundred hours in
between are unobserved and unstructured. Students plateau, cannot see progress, blame
the coach, and quit. Coaches, meanwhile, are hard-capped by calendar hours — bounded by
daylight, weather, season, and body — and every escape route from that cap (book, YouTube
channel, video course) trades away the personalization that made the coaching work.

The incumbent, CoachNow, is a communication and video-analysis hub: per-athlete Spaces,
drawing tools with angle detection, a reusable drill library, batch messaging, scheduled
posts, and imported reports from other technologies. Its flagship customer is IMG Academy.

Its unit of value is **a message sent**. It proves the coach communicated. It never proves
the student improved.

### Where the category is beatable

**Table stakes weaknesses**

- Capture quality is dumped on the student — bad angles, wrong framing, unlabeled clubs.
  Coaches burn goodwill asking for reshoots.
- Imported reports arrive as dead PDFs. Nothing is longitudinal; you cannot ask whether a
  measurement has moved over six months.
- Coach business tooling is thin: no churn signal, no renewal engine, no alert when a
  student has not booked in seven weeks while their trend is worsening.

**Structural gaps**

- No model of outcomes. Communication is measured; improvement is not.
- The hundred hours between lessons are unmanaged.
- Range work is disconnected from actual scoring. Strokes-gained data exists (Arccos,
  Shot Scope, Garmin) in a silo the coach never sees.
- Asynchronous review is unpaid labor. Coaches review video at night for free and pay a
  SaaS fee for the privilege. There is no billable container for async coaching.
- No discovery. The tool serves a coach's existing book of business only.

**The 2026 unlock**

- AI drafts, the coach edits — pose estimation, fault detection, and a drafted note in the
  coach's own style. Ninety seconds of approval instead of fifteen minutes of authoring.
  That is roughly a tenfold increase in async throughput, which is what makes async
  coaching sellable rather than donated.
- A student-facing assistant grounded in *that coach's* library and past corrections, not
  in generic internet golf content.
- Verified practice plus repeatable benchmark tests, turning "I feel stuck" into an
  objective progress curve.

---

## 2. Unique market proposition

> **One coach. One method. Every course on earth.**

Not a marketplace and not a messaging tool. A named PGA Master Professional's system,
delivered by software trained exclusively on *his* method and voice, with him personally in
the loop at the moments that require judgment.

Two surfaces, one brain:

- **The Pocket Instructor** — range and practice. Diagnoses the swing, prescribes work in
  his method, retests, and tracks whether anything actually moved.
- **The On-Demand Pro** — on course. Knows the hole in front of you *and* knows you miss
  right with driver under pressure, and tells you what he would tell you.

Neither half is novel alone. **The join is the product.** Arccos and Shot Scope know your
dispersion and the course but have no coach and no swing. CoachNow knows the swing but has
no round data and no course. GolfLogix has course maps and generic strategy with no player
model. Instructional video has no personalization at all. The white space is the
intersection, and what makes the intersection good rather than merely integrated is a
master professional's judgment sitting in the middle of it.

### Why the expertise is a moat

Experience in a person's head is not a moat; every academy has a veteran pro and none of
them can sell that. Experience *encoded* is a moat.

What decades of teaching actually buys is **prior probabilities**. He has seen the same
fault thousands of times and knows which of the six textbook fixes works for a 58-year-old
with a bad back, versus a flexible 14-year-old, versus a 12-handicap who has already been
over-taught. A general-purpose model trained on published golf content knows every theory
ever written and has no basis to choose between them; it returns the average of a
contradictory corpus. He returns a decision.

**The differentiator is his fault-to-fix decision tree, with priors, conditioned on player
archetype.** Not the video tooling.

### The compounding asset

Every correction he makes to a drafted diagnosis or prescription is stored as a **labeled
training example**, never as a silent overwrite. The system becomes more like him the more
he uses it. That corpus is the moat, and it stays with the platform when additional pros
are onboarded.

---

## 3. Business shape

**Multi-tenant platform, first tenant super-customized.** Pro #1 gets white-glove depth and
his own brand. Every pro-specific element lives in a swappable per-tenant layer from day
one, so pro #2 is configuration rather than a rewrite. This also keeps a pivot cheap in
either direction.

The platform sell to pro #2: course charting is expensive and gets built once, so a new
pro inherits global course coverage on signup. No individual pro could build that alone,
which is the reason to rent the platform rather than hire a developer.

---

## 4. The three core objects

### Player Model (shared schema, per user)

The asset that compounds and the reason a user cannot leave. Carries skill level, physical
constraints and injury history, shot dispersion by club, fault history, tendencies under
pressure, goals, practice access, equipment situation, learning style, play frequency,
handedness, language, and climate. Built from the Video Combine, follow-up intake, and
round history. Longitudinal, not a static handicap.

### Method Model (per tenant)

The pro's system, encoded: fault taxonomy in his own vocabulary, drill library,
prescription decision rules with priors, archetype definitions, and voice and tone. This is
the swappable layer and the entire product for pro #2.

### Course Model (global, shared across all tenants)

Hole-by-hole strategic knowledge. Not a yardage book: where the miss is genuinely dead
versus merely annoying, effective landing zones conditioned on a given dispersion pattern,
green complex behavior, and shots that look available but are not.

### The loop

```
Diagnose  →  Prescribe  →  Monitor  →  Apply
(player +    (method       (retest +   (player ×
 swing)       model)        rounds)     course)
     ↑                                     |
     └────────── pro corrects ─────────────┘
                (labeled training data)
```

---

## 5. Scope

### In scope for v1 — six domains

1. Assessment and player level (the Video Combine)
2. Full swing diagnosis and prescription
3. Short game diagnosis and prescription (chipping, pitching, bunker)
4. Putting diagnosis and prescription
5. Practice prescription, verification, and progress monitoring
6. Course strategy — global coverage

Plus: booking a real lesson with the pro.

Short game and putting are in because they are inexpensive once the diagnosis engine
exists, and because they immediately differentiate the product from a category that is
full-swing-obsessed.

### Deferred, with reasons

- **Equipment fitting and gapping** — needs launch-monitor data we will not have.
- **Mental game** — hard to deliver non-generically; wait until the player model is rich
  enough to personalize it.
- **Rules and etiquette** — low incremental value, easy to add later. Note that the
  beginner on-ramp still covers enough etiquette to get a nervous first-timer onto a course.
- **Community and accountability features** — require user volume.
- **Competition and recruiting prep** — narrow segment; add when juniors arrive in numbers.

### Deferred and flagged for liability

**The physical and mobility screen.** An app prescribing physical work to a 58-year-old
with a bad back carries real exposure. When it arrives it must **screen and refer** — "this
pattern usually indicates a mobility limitation; see a TPI-certified professional" — and
must never diagnose a condition or prescribe rehabilitation. The refer-don't-prescribe
posture is designed in now even though the feature ships later.

### Explicitly out of scope

- Coach discovery marketplace. Single-tenant branded products first.
- Wearables and sensor hardware.
- Simulator and launch-monitor integrations beyond file import.

---

## 6. The Video Combine — assessment

Assessment is a **standardized video protocol**, not a questionnaire. Self-reported
handicap is the weakest input in golf: most golfers carry no official index, and many who
do carry a flattering one.

### Protocol

Face-on and down-the-line for driver and a mid-iron, plus a pitch, a chip, and a putting
stroke. **Three consecutive swings each, unedited.** The unedited requirement is
load-bearing: everyone submits their one good swing, and the variance across three is more
diagnostic than the quality of the best one.

### Signals extracted

- Kinematic sequencing — whether hips, torso, arms, and club fire in order
- Tempo ratio
- Setup fundamentals — grip, posture, alignment, ball position
- Visible physical constraints — restricted rotation, early extension, loss of posture
- Club path and face proxies from the down-the-line view
- **Consistency across the three swings.** Dispersion predicts scoring better than peak
  swing quality does.
- **Strike audio.** Centered contact, thin, and fat have distinct acoustic signatures. The
  signal is already in the video and costs nothing to capture. No competitor uses it.

### Why standardization is required

If capture angles drift between sessions, the progress curve measures camera position
rather than the golfer. Consistent framing is what makes longitudinal monitoring a real
measurement instead of noise. This is why guided capture is load-bearing rather than a
convenience.

### Output

A **per-domain profile** — full swing, short game, and putting assessed separately, because
they genuinely diverge. A 12-handicap swing paired with a 25-handicap short game is common,
and naming that mismatch is often the most useful thing that can be said to a new user on
day one.

### Stated limit

Video assesses **mechanics and consistency**. It does not assess **scoring**. Beautiful
swings shoot 95 and ugly swings shoot 78, routinely. The level readout therefore carries an
explicit confidence and recalibrates as real round data arrives. A video-derived handicap
estimate is never presented as if it were a measured one.

---

## 7. The archetype layer

### One method, many deliveries

The pro does not hold twelve philosophies. He holds one philosophy and decades of knowing
how to express it to a nervous 62-year-old with a fused vertebra versus a flexible
14-year-old who has already been over-coached online.

- **Fixed (Method Model):** fault taxonomy, ball-flight physics, and the priority order of
  what to fix first. Never varies. This is what makes it his system rather than a content
  farm.
- **Conditioned (archetype layer):** which fix is chosen from the several that would work,
  how it is explained, what practice is prescribed given time and facility access, and what
  is deliberately **deprioritized** because the student is not ready for it.

That final item is the no-nonsense part. Much of great coaching is refusing to teach
someone something they are not ready for.

### Dimensions carried

Skill level; age and life stage; physical profile and injury history; goals; practice
access (none, home mat and net, range, full facility, simulator); equipment situation;
learning style (feel, mechanics, visual, or data — genuinely predictive, since some players
get measurably worse when handed mechanical detail); play frequency; handedness; language;
climate and season length.

Content is not branched across every dimension. The pro defines a workable set of
archetypes — expected to be eight to twelve — and prescriptions condition on archetype plus
a few continuous variables. Content is authored once, with variants only where the variant
changes the instruction.

### Breadth at launch

**Full breadth at launch** — all archetypes served at depth from day one.

This makes the pro the bottleneck, and the mitigation is the same flywheel pointed at
content production: **AI drafts each archetype variant from his core method and interview
transcripts; he reviews and corrects rather than authors.** Approval takes a fraction of
the time authoring does, and his corrections become labeled data. Review time is prioritized
by expected usage volume.

### Underserved segments served deliberately

Each is inexpensive if designed in from the start, expensive to retrofit, and a loyalty win
because incumbents ignore them:

- **Left-handers** — roughly one golfer in ten, and nearly all instructional content is
  right-handed with a mirrored afterthought. Native handling costs almost nothing if it is
  in the data model on day one.
- **Women** — most strokes-gained baselines and swing-speed norms are built on men.
  Applying men's benchmarks to women is both wrong and alienating, and it is the industry
  default.
- **Seniors** — the largest segment with time and money, routinely handed instruction their
  bodies cannot execute.
- **Absolute beginners and the intimidated** — people who have never set foot on a course
  and are too self-conscious to start. Rules and etiquette belong here as an on-ramp.
- **Adaptive golfers** — seated, single-limb, visually impaired. Small, nearly ignored,
  and worth serving.
- **Non-English speakers** — the method translates cleanly if localization is structural
  from day one and is brutal to add later.

---

## 8. Global course charting

Sources disagree on the global count. The R&A's *Golf Around the World* survey reports
**38,081 courses across 206 countries** (roughly 576,500 holes), of which the United States
holds 16,156. Commercial directories such as AllSquare catalogue closer to **33,000**. The
difference is a counting question — facilities versus courses, and what each source has
actually catalogued. **Treat the figure as 33,000–38,000 and never assert a precise
number** in code or copy.

Charting them is achievable because **strategy is computed, not authored.**

Course coverage is a **bonus that makes the product feel limitless, not the product
itself.** The coaching relationship is what people pay for. Global coverage is what makes a
second pro want to rent the platform rather than build their own.

### Tier 1 — Geometry (automatable, global)

Hole routing, tee and green locations, bunker, water and OB polygons, and elevation.
OpenStreetMap already carries golf-specific tagging (`golf=hole`, `green`, `bunker`,
`fairway`, `water_hazard`) with uneven but real global coverage. Satellite segmentation
fills the gaps. Elevation comes from public DEM data.

### Tier 2 — Strategy (derived)

Given hole geometry and a player's shot dispersion, optimal strategy is a computation:
Monte Carlo the dispersion ellipse across the hole, minimize expected strokes, return the
aim point and club. Nothing is authored. It generates for every hole on earth the moment
geometry exists, and it is automatically personalized because dispersion is per-player.

**The pro calibrates the framework once — his decision rules and risk posture — and it then
applies everywhere.** This is why global coverage does not require him to have walked the
course.

### Tier 3 — Local nuance (accretes from users)

Prevailing wind, green firmness, which pins are sucker pins. Does not scale by authoring;
accumulates from played rounds. It is the last ten percent and is not needed at launch.

### Risks

- **Imagery licensing is a budget line, not free.** Sentinel-2 is free at 10m/pixel, too
  coarse for bunkers. NAIP is 1m and free but US-only. Google, Mapbox, and Esri terms
  generally restrict building derived datasets from their tiles. Global high-resolution
  coverage costs money and requires a licensing decision before the pipeline is built.
- **OpenStreetMap is ODbL** — share-alike, potentially viral for a derived database.
  Requires legal review before it is load-bearing.
- **Coverage must be labeled, never implied.** Per-course confidence badge: *charted from
  imagery, unverified* versus *player-verified*. Presenting a poorly-sourced hole as
  authoritative is fabricating a yardage book, and someone hits it into water on our advice.

### The directory is the navigation spine

Country → state → course → hole, every level clickable. The United States alone gives fifty
state pages with live course counts — New Mexico around 81, Ohio around 795, Texas around
855 by AllSquare's count. Each course gets a page with its holes, its imagery, and its
coverage grade.

Each course carries a photograph. **Not scraped from commercial directories** — their
listings and photography are copyrighted, and attribution does not cure infringement. The
legitimate sources, in order of preference:

- **NAIP** (USDA National Agriculture Imagery Program) — 1-metre aerial imagery, public
  domain, covering all fifty states. Every American course gets a clean aerial image at no
  cost and no licensing risk.
- **Sentinel-2 / Copernicus** — free, global, 10 metres. Coarse but usable as a locator
  outside the US.
- **Wikimedia Commons** where a course happens to be photographed.
- **User-submitted**, with an explicit rights grant in the terms.
- **Course-provided**, by arrangement.

Every stored image carries a non-nullable licence, source URL, and attribution. There is no
code path that stores an image without provenance.

### Round records and pre-round preparation

Users enter their own rounds hole by hole at specific courses: strokes, putts, fairway,
green in regulation, penalties. Two things follow.

**For the golfer:** a real record of how they play each course, and — accumulated — the
dispersion model that makes computed strategy personal.

**For the pro:** a **pre-round preparation brief.** A student says "I'm playing Paa-Ko
Ridge on Saturday," and he opens the course, sees the holes and hazards alongside that
student's own history there, and preps a plan in advance. No product does this, it is
concrete enough to sell, and it turns the course directory from a lookup table into
coaching.

### Sequencing

Do not pre-chart every course. Pre-chart the courses users are likely to play, auto-chart
any course on first request, and let the long tail fill itself.

The strategy engine depends on a dispersion model, which depends on accumulated round data.
So the order is: directory and round records first, computed strategy second. That is a
dependency, not a deferral.

---

## 9. Inputs and the data flywheel

The product accepts **many inputs**, and the aggregate of those inputs across many golfers
becomes a second moat — one that does not depend on any individual pro.

### Input types

| Input | Source | What it yields |
|---|---|---|
| Range and practice video | Video Combine, guided capture | Mechanics, sequencing, consistency |
| **On-course swing video** | Captured during play | The transfer gap (see below) |
| Strike audio | Already inside every video | Contact quality, no extra hardware |
| Scores and rounds | Manual entry, scorecard photo OCR | Scoring level, trend, honest allocation |
| Shot-level data | Arccos, Shot Scope, Garmin import | Dispersion by club, strokes-gained |
| Course geometry | OSM, satellite, DEM | Strategy computation |
| Conditions | Public weather APIs | Wind and temperature context for every round |
| Benchmark test results | Prescribed retests | Objective progress curve |

### On-course swing capture closes the transfer gap

The most common complaint in golf is "I hit it great on the range and terrible on the
course," and no product has data on the course swing because nobody films there. Range
swings are taken from flat lies, with no consequence, in rhythm, hitting the same club
repeatedly. Course swings are taken from slopes, cold, under pressure, once.

**Capturing swings during actual play is a genuinely novel input**, and the delta between a
golfer's range swing and their course swing is diagnostic in a way neither is alone. It is
also the input most likely to validate or refute what was taught on the range.

### The aggregate layer

Once many golfers' shots and scores accumulate on the same holes, the data yields things no
existing product has:

- **Empirical hole difficulty conditioned on player type.** Not the single stroke-index
  number every course publishes for every golfer, but: for a 15-handicap who misses right,
  this hole plays measurably harder than it does for a 15-handicap who misses left. This is
  the Tier 3 local nuance from Section 8, arriving without anyone authoring it.
- **Dispersion norms by archetype**, replacing the industry's men-only baselines.
- **Which prescriptions actually produce measurable improvement, for whom.**

### The evidence base

This is the long-term strategic asset. **Golf instruction has essentially no outcome
evidence base.** Medicine has trials; golf has opinion, tradition, and marketing. A
platform holding thousands of golfers, prescribed interventions, and measured before-and-
after benchmarks can build the first real body of evidence about which teaching
interventions produce improvement and in which players.

That does two things: it validates the pro's method with data rather than assertion, and
over time it sharpens the priors beyond what any single career of observation can supply.

### Honest constraints on all of the above

- **This does not exist at launch.** Network effects need volume. Tier 3 nuance, archetype
  norms, and outcome evidence are all cold-start-gated and must not be promised on day one.
- **Observational data is not causal.** Golfers who follow prescriptions also practice more
  and are more motivated. Improvement will correlate with the intervention for reasons that
  are not the intervention. Any published claim must say so.
- **Randomization is available and cheap if wanted.** Where the pro considers two drills
  genuinely equivalent for a given fault, assigning them at random turns the platform into
  a real experiment at no cost to the student. This is optional and worth considering.
- **Consent for secondary use is mandatory.** Aggregate analysis requires explicit,
  separable consent, de-identification before aggregation, and a published data-use policy.
  Round data and swing video are personal data. This is specified in Section 10.

---

## 10. Legal and safety

1. **Health attestation at onboarding.** PAR-Q-style: the user affirms they are in
   condition for physical activity, discloses contraindications, and is directed to a
   physician if anything is flagged. Re-affirmed periodically, not once forever.
2. **Assumption of risk and liability waiver.** Golf involves swinging a club at speed;
   injury is foreseeable. Versioned and timestamped, with an **immutable record of which
   version each user accepted.** That audit trail is the part that matters if it is ever
   tested.
3. **Medical disclaimer and refer-don't-prescribe posture.** The product screens and
   refers. It never diagnoses a physical condition or prescribes rehabilitation.
4. **Minors.** Juniors are a named target segment, so this is not optional: verified
   parental consent, parent-signed waiver, and COPPA obligations for users under 13.
5. **On-course advice disclaimer.** Strategy is a recommendation; conditions vary; the
   player is responsible for their own shot.
6. **Consent for secondary use of data.** Aggregate analysis (Section 9) requires consent
   that is explicit and separable from the terms of service — a user must be able to use
   the product while declining aggregate use. De-identification happens before aggregation,
   and the data-use policy is published in plain language. Swing video is biometric-adjacent
   and several states regulate it specifically; include this in the attorney review.

**Waiver enforceability varies by state, and many states will not enforce a waiver against
gross negligence.** All of the above are drafted as **DRAFT pending review by a licensed
attorney**, and no user signs one before that review is complete.

### Marketing claims

Outcome guarantees ("can turn anyone into an excellent golfer") are strong brand voice and
unusable as printed promises: unverifiable, exposed on advertising-claims grounds, and
corrosive to the honest progress reporting the product depends on. Let benchmark data prove
it — real before-and-after on real students. Demonstrated beats claimed.

The **PGA Master Professional** credential is a defined, rare classification and should be
named precisely rather than diluted. It is checkable, which is exactly why it is worth more
than an outcome guarantee.

---

## 11. Architecture

### Tenancy

Single codebase, one tenant per pro.

- **Tenant-scoped:** Method Model, brand, voice, pricing.
- **Shared:** Player Model schema, diagnosis engine, strategy engine, and the global Course
  Model.

### Services

1. **Intake & Assessment** — the Video Combine; populates the Player Model.
2. **Capture** — guided mobile video: framing guides, auto swing detection, auto club
   tagging, auto-trim. Eliminates the reshoot tax. Two modes: **practice capture**
   (standardized protocol, full guidance) and **on-course capture** (fast, one-tap,
   tolerant of imperfect framing, tagged with hole and lie).
3. **Diagnosis Engine** — pose estimation, kinematic features, faults ranked against the
   tenant's taxonomy, each with a confidence score.
4. **Prescription Engine** — fault plus archetype plus practice access, producing drills
   and an explanation in the pro's voice.
5. **Review Console** (pro-facing) — a queue of low-confidence and first-time cases. Approve
   or correct. Corrections stored as labeled examples, never silent overwrites.
6. **Practice & Monitoring** — prescribed work, verification, benchmark retests, progress
   curves.
7. **Round Ingestion** — manual entry, scorecard photo OCR, and Arccos/Shot Scope import,
   producing a dispersion model and strokes-gained analysis.
7a. **Aggregation Service** — de-identified population analysis feeding empirical hole
    difficulty, archetype dispersion norms, and prescription outcome evidence. Reads only
    from users who granted secondary-use consent.
8. **Course Service** — geometry pipeline plus computed strategy.
9. **On-Course Advisor** — Player Model × Course Model.
10. **Commerce** — subscriptions, lesson booking, packages.
11. **Consent & Compliance** — versioned waivers, health attestation, minor consent,
    immutable audit log.

### The confidence gate

Nothing ships under the pro's name that he has not either approved directly or that does
not fall inside a pattern he has already approved. High-confidence diagnoses matching
reviewed patterns pass through; everything else queues for review. Users see plainly what
is AI-drafted versus pro-reviewed — labeled, not buried.

This is not decoration. The credential is the entire asset, and one confidently wrong piece
of advice under his name does more damage than a slow launch.

### Honest allocation

The product tells the user what to work on even when it is not what they came for:

> "You booked a driver lesson. Your last ten rounds say the driver is costing you about a
> shot and a half, and three-putting is costing you four. We are doing putting today."

This is what a no-nonsense professional says to your face, and no app does it, because
every app is built to sell you what you came for. It requires the Player Model plus round
data, so it reinforces the wedge rather than diluting it.

### Stack

Next.js with TypeScript, Postgres with Prisma, object storage for video. PWA first, native
later when capture quality demands it. Pose estimation split between on-device (instant
framing feedback) and server-side (diagnosis). Claude API for drafting, grounded strictly
in tenant-scoped Method Model content. ElevenLabs for the pro's voice on prescriptions,
always disclosed as synthesized.

### Testing

**A golden set of swings labeled by the pro himself.** Without a pro-labeled evaluation set
there is no way to tell whether a model change improved or degraded diagnosis, and
regressions ship blind. Building this set is part of the extraction interviews, not an
afterthought.

---

## 12. Critical path

**Method extraction is the first work item and it is not code.** Structured, recorded
interviews with the pro, transcribed and converted into: the fault taxonomy in his
vocabulary, the drill library, archetype definitions, prescription decision rules, and the
golden evaluation set. Several sessions. Nothing meaningful ships before it.

Build order:

1. Method extraction interviews → Method Model v1 + golden set
2. Consent and compliance layer (waivers, health attestation, audit log) — must exist
   before any user touches the product
3. Capture and the Video Combine → Player Model
4. Diagnosis Engine + Review Console (the loop that generates labeled data)
5. Prescription Engine + practice monitoring
6. Round ingestion → dispersion and honest allocation
7. Course geometry pipeline → computed strategy → On-Demand Pro
8. Commerce and lesson booking

---

## 13. Open items

These are unresolved and must not be treated as decided:

- **Verify the pro's exact credential and title.** Use it precisely in all copy.
- **Satellite imagery licensing decision.** Determines whether global Tier 1 coverage is
  feasible within budget and which vendor terms permit derived datasets.
- **ODbL legal review** for the OpenStreetMap-derived course database.
- **Attorney review** of waiver, health attestation, minor consent, and on-course
  disclaimer. Drafts only until cleared.
- **The archetype list itself** — to be defined by the pro during extraction interviews,
  not assumed here.
- **Competitive claims in Section 1** are analysis based on CoachNow's public marketing
  page and general category knowledge, not primary research. They should be validated in
  conversation with practicing teaching professionals before they drive strategy.
- **Pricing model** — not yet designed.
- **Exact global course count** — 33,000 (AllSquare) versus 38,081 (R&A). Unresolved, and
  deliberately left as a range.
- **NAIP retrieval pipeline** — confirmed public domain, but the bulk-access mechanism and
  storage cost for ~16,000 US course images is unscoped.
- **Non-US course imagery** — Sentinel-2 at 10 metres is a weak hero image. No decision yet
  on whether that is acceptable or whether commercial licensing is warranted outside the US.
