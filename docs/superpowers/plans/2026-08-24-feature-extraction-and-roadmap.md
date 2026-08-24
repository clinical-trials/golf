# Feature Extraction and Roadmap — Ideas To Evaluate Before Building

**Status:** Research and planning only. Nothing here is committed to the build. Each item
has a recommendation (adopt / borrow / skip) and a reason.

This document exists because several ideas and reference projects came up quickly. Rather
than bolt them on, they are captured here with an honest read on licence, effort, and
whether they actually extend Pocket Pro beyond CoachNow.

---

## Reference projects reviewed

### open-golf-coach (OpenLaunchLabs) — Apache 2.0

A Rust + WebAssembly library that turns raw launch-monitor numbers into derived shot
metrics: carry, total, offline, spin components, deterministic shot classification (with
left- and right-handed results returned together), and 500 Hz trajectory simulation.

- **Recommendation: ADOPT as a dependency, later.** It is exactly the physics layer the
  spec defers under "equipment fitting needs launch-monitor data." Apache 2.0 permits
  commercial use with attribution. When a user imports Trackman or GCQuad data, this
  library computes the derived metrics instead of us reinventing ball flight. The
  left/right-handed-by-default design also matches our first-class-left-handers rule.
- **Not now:** it is only useful once launch-monitor import exists, which is post-MVP.

### OGA / opengolfapp — MIT

A free, open-source Arccos alternative: hole-by-hole logging, GPS live-round tracking,
strokes-gained by category, shot-pattern dispersion, AI practice plans from a drill
library, ~15,300 US courses, handicap calculation. React/Expo/Supabase.

- **Recommendation: BORROW ideas, do not fork.** It is a *tracking* app; we are a
  *coaching* product, and the whole thesis is that a pro's judgment sits where OGA has an
  algorithm. But two things are worth studying: its strokes-gained-by-category breakdown is
  the exact input our honest-allocation feature needs, and its live-round GPS mode is a
  proven pattern for the On-Demand Pro. MIT means we *could* read its implementation for
  reference. We should not adopt its data model — ours is coaching-first, not round-first.
- **Competitive read:** OGA proves the tracking layer can be free. That is a reason our
  paid layer must be the coaching relationship, never the tracking.

### data-golf-api (coreyjs) — MIT wrapper, paid data behind it

Python wrapper over DataGolf.com: tournament predictions, player skill ratings, live
in-play stats, betting odds. Requires a paid DataGolf key.

- **Recommendation: SKIP for now.** This is tour/betting analytics, not amateur coaching.
  None of it touches the diagnosis loop or the student. Revisit only if we ever build a
  tour-caddie or fantasy feature, which is nowhere near our wedge.

### PGA Coach (pga.coach) — the credentialed competitor

The PGA of America's own coach platform: activity planning, note-taking, assessment, built
around the American Development Model curriculum.

- **Recommendation: STUDY as the incumbent to differentiate from, do not copy.** This is
  the most important competitive reference on the list, because it is what our pro's peers
  already use and it carries official credibility. Its weakness is the same as CoachNow's:
  it is a planning-and-notes tool with no outcome model, no course intelligence, and no AI
  drafting. Our positioning against it is identical to our positioning against CoachNow —
  measure outcomes, not activity — plus we should make sure our language respects the
  American Development Model rather than contradicting it, since our pro likely knows it.

### goatcode.ai — AI coding platform, not golf

- **Recommendation: SKIP.** A general AI coding tool, not a golf product. Nothing to extract.

### HuggingFace golf-course-generator (bethecloud) — OpenRAIL-M

A Stable Diffusion / DreamBooth model that generates *synthetic* golf course images
(fine-tuned on 21 Unsplash photos), e.g. "a golf course with the Acropolis behind it."

- **Recommendation: SKIP for course rendering — this is the opposite of our imagery
  principle.** We just wired in *real* USGS aerial photography precisely so the picture
  matches the ground truth a golfer will play. A generative model invents plausible-looking
  turf that corresponds to no real hole. Using it to render a course a user is about to play
  would be exactly the fabrication the coverage grades exist to prevent. It could have a
  narrow role as decorative art on a marketing page, clearly labelled as AI-generated — but
  never as a hole map.

---

## New product ideas raised

### On-course capture rig ("golfer's tripod")

A mount that clips a phone to the bag and films the shot on course, so on-course swing
capture (already in the spec as a novel input) becomes effortless.

- **Recommendation: PARK as hardware, prove the software need first.** The spec already
  argues on-course swing video is the single most novel input we can collect. A dedicated
  mount would help, but hardware is a different business with inventory, returns, and
  manufacturing. The right sequence: prove people will film on-course with a phone propped
  on the bag, measure whether the data is diagnostic, and only then consider a branded
  mount. Do not start with hardware.

### 3D pose and posture assessment from video

Reconstruct the player's body in 3D from a phone video to measure posture, spine angle,
hip and shoulder turn, and swing-plane angles.

- **Recommendation: ADOPT the 2D core for the diagnosis engine; treat true 3D as a later
  tier.** This is genuinely central, not a nice-to-have — it is how the Diagnosis Engine in
  the Foundation-adjacent plans actually reads a swing. The honest engineering picture:
  - **2D pose from a single phone video is mature and runs on-device** (MediaPipe / MoveNet
    class models). It gives joint positions per frame, which already yields spine angle at
    address, head movement, hip and shoulder line, tempo, and sequencing — most of what a
    coach reads face-on and down-the-line. This belongs in v1 of the diagnosis engine.
  - **True 3D from a single camera is an estimation, not a measurement.** Monocular 3D pose
    (e.g. lifting models) exists but is noisy on fast rotational motion like a golf swing;
    depth is inferred, not seen. Presenting it as measured angles would overstate certainty
    — the same reputational risk as a wrong diagnosis under the pro's name.
  - **Reliable 3D needs two synchronised camera angles.** We already ask for face-on *and*
    down-the-line in the Video Combine. Two calibrated views can be triangulated into
    defensible 3D. That is the honest path to real 3D angles, and it reuses capture we
    already require.
  - **Recommendation:** v1 diagnosis engine uses 2D pose per view and reports what 2D
    honestly supports. A "3D from your two Combine angles" feature is a strong later
    milestone, with stated confidence, once the two-view capture is calibrated. Never render
    a single-camera 3D skeleton as if the depth were measured.
  - **Ties to the earlier video-markup idea:** angle overlays and drawing tools on the video
    are the coach-facing surface for exactly these measurements, so the two ideas are one
    feature — pose estimation underneath, markup and angle tools on top.

### Video markup with angle tools

Draw lines, angles, and reference planes over a swing video — the CoachNow table-stakes
feature.

- **Recommendation: ADOPT, as the presentation layer over pose estimation.** This is table
  stakes; a coaching product without it looks unserious next to CoachNow and PGA Coach. The
  difference is that ours is *seeded* by the pose engine — the spine-angle line and
  shoulder line are drawn automatically from detected joints, and the pro adjusts rather
  than drawing every line by hand. That is faster for the coach and consistent frame to
  frame, which is what makes a progress comparison valid.

---

### Weather forecast for the round window

A forecast tuned to golf: not "is it raining now" but "is the next 4–5 hour window good to
play," since a round is long. Reference: the HuggingFace Golf-Forecaster space.

- **Recommendation: ADOPT, built on a free public weather API — not a scraped or unlicensed
  source.** This is genuinely useful and it strengthens the On-Demand Pro: wind speed and
  direction already feed the strategy engine's dispersion, and a playability read over the
  round window is a natural companion to booking a tee time or a lesson. The honest build:
  use a public forecast API (the US National Weather Service api.weather.gov is free, public
  domain, no key; Open-Meteo is free for non-commercial and CC-BY) and compute a simple
  playability score over the booking window from wind, precipitation probability, and
  temperature. Do not present it as a guarantee — a forecast is a forecast, and the
  on-course disclaimer already covers conditions varying.
- **Sequencing:** small, and it slots naturally beside the scheduling feature, since both
  are about a specific time at a specific place. Reasonable as a fast follow.

### Golf-trip itinerary generator

Generate a multi-day golf-trip plan — which courses, in what order, with travel between
them. Reference: the HuggingFace golf-trip-itinerary-generator space.

- **Recommendation: PARK as a marketing and partnership play, not core coaching.** It does
  not touch the diagnosis loop or the coaching relationship, so it is not part of the wedge.
  But it has a real commercial angle the coaching product does not: course and resort
  partnerships, affiliate booking, and sponsorship. That makes it a plausible later revenue
  or acquisition surface rather than a v1 feature. Keep it on the list, build it only once
  the core relationship exists and there is an audience to route to partner courses.

## Suggested build order impact

None of this changes the critical path, which is still: method extraction → consent layer →
capture → diagnosis. What it adds is clarity on later milestones:

1. **Diagnosis engine v1** uses **2D pose per view** with **auto-seeded angle markup**.
   (Adopts: pose estimation, video markup.)
2. **3D from two Combine angles** as a later, confidence-stated milestone.
3. **Launch-monitor import** adopts **open-golf-coach** (Apache 2.0) for derived metrics.
4. **Strokes-gained-by-category** for honest allocation — study OGA's breakdown, build our
   own coaching-first version.
5. **On-course capture** proven in software before any hardware mount is considered.
6. **Skip:** data-golf-api, goatcode, and generative course imagery for hole maps.

## Licence summary

| Project | Licence | Use |
|---|---|---|
| open-golf-coach | Apache 2.0 | Adopt as dependency (attribution) |
| opengolfapp / OGA | MIT | Borrow ideas; reference reading permitted |
| data-golf-api | MIT wrapper, paid data | Skip |
| golf-course-generator | OpenRAIL-M | Skip for hole maps; labelled art only |
| PGA Coach | Proprietary | Study only, do not copy |

Every adopt/borrow above is a permissive licence, so building on them is clean provided
attribution is preserved. No proprietary code is copied.
