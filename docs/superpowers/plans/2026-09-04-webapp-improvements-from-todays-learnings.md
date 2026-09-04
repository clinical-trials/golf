# Pocket Pro — improvement plan from today's build (2026-09-04)

A working backlog written off what we actually built and learned today, ordered
by leverage. Everything here keeps the house rule: **nothing fabricated, real
data or an honest fallback, real people's media stays private.**

## What shipped today (context)
- **Live leaderboard** (PGA / LPGA toggle) from ESPN's public feed, with an honest
  "appears once play begins" fallback. Two buttons, links to the official tours.
- **Player Review Center** (coach side) + **Swing reviews** in *My Progress*
  (player side): loop + slow-mo, Tom's read attached, corrective-focus tags. The
  real clip is kept **local/gitignored** — public shows a placeholder.
- **Featured-classes rotator** atop Classes (Putting Intensive, Women's Golf, …)
  from real programs.json data; emphasises the *group* nature.
- Course tool: **search**, **back button**, **+8 real courses** (36 total), the
  **St Andrews** non-US routing fix.
- Content: sessions FAQ, women's attire builder, corporate team-building copy,
  PopStroke, etiquette/clubs edits, PGA-of-America logo, grass background.
- **PGA Code of Ethics** read: our honesty ethos maps onto it; keep marks tied to
  Tom's individual credential, never imply PGA endorsement of the platform.

## The one thing that unlocks the most: a gated backend
Three separate features today all dead-ended at the same wall — **auth + private
storage**. The swing videos, the dashboard's real data, and the Tom-messaging
relay are all real and scoped but can't go live on a static site.

**Plan:** stand up the Next.js/Prisma/Postgres backend (already written) on the
founder's hosting, add sign-in + per-player private video storage, and flip the
review center from "local preview" to "real, private, player-and-Tom-only."
This is the highest-leverage next step; everything below gets better once it
exists. Turnkey deploy runbook is the blocker to write next.

## Backlog by area (highest leverage first)

### 1. Swing-review loop (the moat)
- **Private per-player video library**: upload from phone → stored per account →
  visible only to that player + Tom. (Needs backend §above.)
- **Capture UX**: the auto-trigger + trim + loop-on-device flow from the
  biomechanics plan; ship "record → submit → Tom answers" before the automatic
  read. Re-export tooling: today's sample arrived **truncated** (~1s) — add a
  guard that rejects/repairs corrupt uploads and asks for a re-record.
- **Side-by-side progress**: two clips (baseline vs latest) with synced scrubbers
  — the timeline already promises this.

### 2. Live data (leaderboard is the beachhead)
- **Auto-refresh** every ~60s while an event's status is "In Progress" (not just
  on reload); show a subtle "updated Xs ago."
- **Add a Tour/FedEx toggle** once the season's points feed populates (it's empty
  off-season now) — same honest-fallback pattern.
- **"This week in golf"** one-liner (event name + dates) already half-built via
  the scoreboard `event.name`; surface it site-wide (e.g., a thin banner).
- **"Bring one thing you saw"**: let a logged-in student attach a note from a
  tournament straight into their next lesson prep.

### 3. Classes → real cohorts
- Featured rotator is live; next, make it **seats-aware**: seats left, waitlist,
  "founding cohort" fills. Needs enrollment records (backend).
- **Cohort roster + group chat** (the group identity the founder wants to stress).
- Confirmed dates replace "proposed at enrollment" once scheduling is real.

### 4. Retention & conversion
- **Email + SMS reminders** (lesson, homework nudge, event) — the biggest
  retention lever; pairs with the messaging relay. (Backend + a provider.)
- **Referral credit** and **gift cards** already have UI; wire to real ledger at
  launch.
- **Lead magnet** (warm-up + putting drill) → real delivery + list.

### 5. Trust, compliance, brand
- Keep PGA marks framed as **Tom's Class A credential**, never platform
  endorsement (per the Code of Ethics read). Consider dropping the older
  "Member Professional" wording the founder flagged as dated.
- Keep every projection/date/skill labelled as estimate/draft — it's both honest
  and on-brand.

### 6. Content & discoverability
- The FAQ/attire/etiquette content is genuinely useful and SEO-friendly — expand
  into short evergreen pages (what to wear, first-round etiquette, one-club
  start) that funnel to First 90 Days.
- Add a women's-golf landing angle (fastest-growing segment) around the outfit
  builder + Women's Golf class.

### 7. Polish
- Grass background is intentionally subtle; offer a stronger hero/footer turf band
  if the founder wants more of it (see the grass-background plan).
- Image optimisation done (11→9.3 MB); revisit once new photography lands.
- Accessibility pass on the new interactive bits (rotator, leaderboard toggle,
  video controls) — keyboard + reduced-motion already handled; audit contrast.

## Suggested sequence
1. **Deploy runbook + backend live** (auth, Postgres) — unblocks 1, 3, 4.
2. **Private swing storage** → review center goes real.
3. **Reminders (email/SMS)** → retention.
4. **Leaderboard auto-refresh + this-week banner** → daily reasons to return.
5. **Cohort seats/roster** → the group story becomes real.

None of this requires fabricating anything; each step turns a labelled preview
into the real thing.
