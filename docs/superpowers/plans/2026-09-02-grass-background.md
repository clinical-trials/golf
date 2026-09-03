# Grass / turf background — plan & what shipped

**Founder ask (2026-09-02):** make the site background look like grass, à la the
team-building post on mikecallahangolf.com.

## The tension

The reference page uses a bright, literal grass photo. Pocket Pro is a dark,
premium editorial design (ink `#0B0F13`, cream type). A loud green photo behind
everything would fight the type, crush contrast, and read cheap. So the goal is
"unmistakably golf-course" **without** breaking readability or the brand.

## What shipped (v1 — subtle, global)

A CSS-only turf layer on `body`, no image download, no payload cost:

- Base shifted from blue-black to a **green-black** (`#0A0F0B`).
- **Fairway mow-stripes:** a `repeating-linear-gradient` at 115° in turf green at
  0.05 alpha — the diagonal cut you see on a mown fairway, barely-there.
- **Soft green glow** at the top via a radial gradient (like light off the turf).
- `background-attachment: fixed`, so content scrolls over a stable "field."

Because every `.surfaces` section is transparent, the turf shows *through* them;
the cream women's panel keeps its solid card, so it reads like a scorecard laid
on grass. Applied to `index.html` and `dashboard.html`.

Verified: body carries both gradients (`fixed`), `.surfaces` sections compute to
transparent so the turf shows, cream panel stays cream, zero console errors.

## If the founder wants it *more* grassy (v2 options)

1. **Stronger mow-stripes** — raise the stripe alpha (0.05 → ~0.09) and/or narrow
   the band. One-line change; dial to taste.
2. **Turf bands in specific spots** — a richer green, blade-textured strip behind
   the hero eyebrow and the footer only, leaving the reading sections calm.
3. **Real turf photo (CC0)** — a public-domain/CC0 close-up (e.g. Wikimedia
   Commons), heavily darkened and blurred as a texture, in the footer band only.
   Honest sourcing, licence noted; still never behind body copy.

Recommendation: keep v1 global + add option 2 (a hero/footer turf band) if a
stronger read is wanted — that gives the grass feeling at the edges while the
content stays crisp. Not doing option 3 site-wide: a photo behind text is the one
thing that reliably looks bad and hurts legibility.
