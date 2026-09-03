# Pocket Pro — Revenue & UX Roadmap

Goal: generate more revenue and make the tool genuinely worth paying for, without
wasting money building the wrong things. Everything below is scoped against what
already exists (consent, player model, scheduling+bookings, Stripe-ready payments,
6-program catalog with enrollment, rounds+scorecard OCR, weather, concierge,
course tips — 95 passing tests) and the honest gate (the diagnosis engine still
needs Tom's method).

Effort: S = hours, M = a few days, L = a week+. Impact = on revenue unless noted.

---

## Tier 0 — The one thing that unlocks ALL revenue

Today the site earns **$0** because checkout is a demo dialog that collects nothing.
Nothing else on this list matters until this ships.

1. **Turn on real Stripe + wire the front end to the real API.** [Impact: decisive · Effort: M]
   - Add live Stripe keys (the backend already selects Stripe the moment
     `STRIPE_SECRET_KEY` is set — no code change).
   - Replace the demo checkout dialog with Stripe Checkout or the Payment Element,
     calling the existing `/api/bookings` and `/api/programs/enroll` (both already
     return a `clientSecret`).
   - Enable Apple Pay / Google Pay (one Stripe setting; big mobile conversion lift).
   - This converts every "Book & pay" and "Enroll" button from a mockup into income.

2. **Deploy the backend.** [Impact: prerequisite · Effort: M]
   - The site is static (GitHub Pages); the earning APIs are not deployed anywhere.
     Stand up Next.js on Vercel + a hosted Postgres. Until this exists, payments,
     accounts and enrollment can't run in production.

---

## Tier 1 — Revenue features (highest impact per unit effort)

3. **Lesson & class packages / bundles.** [Impact: high · Effort: S–M]
   Sell a 5-lesson pack at a small discount. Prepaid = cash upfront + breakage.
   Uses the existing product+payment plumbing; just add multi-session products.

4. **Gift cards / certificates.** [Impact: high, seasonal · Effort: M]
   Golf gifting is huge (holidays, Father's/Mother's Day). Prepaid revenue, new
   customers acquired by existing ones. Stripe supports this cleanly.

5. **Recurring memberships via Stripe Billing.** [Impact: high, compounding · Effort: M]
   The $15 app tier and $99 coaching tier as real subscriptions. Recurring revenue
   is worth far more than one-off, and it's the model the whole 3-year plan assumes.

6. **Checkout order-bumps / upsells.** [Impact: medium-high · Effort: S]
   At lesson checkout: "add a filmed review (+$40)", "add a playing lesson".
   At class checkout: "add the equipment session". Pure margin, one screen.

7. **Waitlist + deposit for full cohorts.** [Impact: medium · Effort: S]
   The schedule already flags "Starting September". Add "seats left" and let a full
   cohort collect a refundable deposit — captures demand instead of losing it.

8. **Corporate lead form (not just checkout).** [Impact: high $/deal · Effort: S]
   Corporate is the biggest ticket ($2–8k/season). Add a real inquiry form that
   captures company, size, dates and routes to follow-up — don't force the biggest
   sale through a self-serve button.

9. **Referral credit ("give $20, get $20").** [Impact: medium · Effort: M]
   Cheapest acquisition channel there is; golfers recruit their foursome.

---

## Tier 2 — Make it worth paying for (retention & "good use of money")

10. **Student accounts + dashboard.** [Impact: retention engine · Effort: L]
    Log in, see program progress, quiz scores, round history, upcoming lessons.
    The backend models exist (Enrollment, WeekProgress, Round). This is what makes
    a subscription renew instead of churn — the single highest-value UX build.

11. **Visible progress / benchmarks.** [Impact: retention + word-of-mouth · Effort: M]
    Chart the Putting Intensive week-1 vs week-4 benchmark; "your game moved X."
    Progress you can see is the reason people stay and tell friends — it's the
    literal brand promise ("your friends start asking what changed").

12. **A real onboarding flow (the intake / Video Combine).** [Impact: activation · Effort: M–L]
    A friendly first-run that "diagnoses the person" — goals, level, schedule — and
    recommends the right program. Turns a browser into an enrolled student.

13. **Free value first (lead magnet).** [Impact: top-of-funnel · Effort: S–M]
    The newsletter exists; give it teeth — a free mini-assessment or a 5-day tip
    drip. Convert curiosity → commitment before asking for money (the mission).

14. **Site navigation + sticky Book CTA.** [Impact: conversion · Effort: S]
    The landing page has grown long. Add a simple sticky header/menu and a
    persistent "Book a lesson" button so the buy action is always one tap away.

15. **Performance pass.** [Impact: conversion + cost · Effort: S]
    Photos are ~800 KB each. Add responsive `srcset`, width/height, aggressive lazy
    loading. Faster loads convert better and cut bandwidth cost — a good use of money.

16. **Installable PWA.** [Impact: "in your pocket" · Effort: S–M]
    Add a manifest + service worker so it installs to the home screen and works at
    the range. Makes the "pocket" promise literal at low cost.

---

## Tier 3 — The "every course" flywheel (differentiation)

17. **Browsable course directory page.** [Impact: SEO + promise · Effort: M]
    `/api/courses` already returns the directory. Build the country → region →
    course → hole pages. Real "every course" coverage, and every course page is an
    SEO landing page that pulls in searchers.

18. **Tom's per-course tips, surfaced.** [Impact: unique value · Effort: S]
    The CourseTip backend exists. A published tip on the courses people actually
    play is the thing no competitor has — and a reason to open the app before a round.

---

## Explicitly NOT worth building yet (good use of money = restraint)

- **The AI diagnosis engine** — blocked on Tom's method extraction. Don't fake it;
  don't build around a moat that doesn't exist yet. Get Tom through the interview.
- **Turf AI, mobile simulator hardware, global non-US imagery licensing** — separate
  businesses / capital projects. Park until the core is funded and earning.
- **Native iOS/Android apps** — a PWA gets 90% of the value at 10% of the cost until
  volume justifies native.
- **Live tee-time inventory** — needs course partnerships; the concierge ranks and
  advises honestly without pretending to hold inventory.

---

## Suggested first sprint (2 weeks, in order)

1. Deploy backend to Vercel + hosted Postgres. (Tier 0 #2)
2. Turn on real Stripe; wire booking + enrollment checkout to the live API. (Tier 0 #1)
3. Add packages + one checkout upsell. (Tier 1 #3, #6)
4. Ship the corporate lead form. (Tier 1 #8)
5. Performance pass + sticky Book CTA. (Tier 2 #15, #14)

That sequence takes the site from "beautiful demo" to "collects money" first, then
starts compounding — before spending a dollar on anything speculative.
