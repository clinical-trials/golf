# Proprietary Biomechanics Layer — feasibility & plan

**Founder question (2026-09-02): can we build our own biomechanics tool layer?**
Short answer: **yes, and it's the moat** — the difference between renting swing
analysis (Swing Catalyst, Sportsbox) and owning the read that makes Pocket Pro
*Tom's* coaching rather than a generic analyzer.

## The idea

Markerless swing analysis from an ordinary phone video: pose estimation →
kinematics (posture, sequence, low point, face/path proxies, tempo) → compared to
population norms *and* to Tom's labelled fault library → a plain-language read in
his voice. No sensors, no suit, no marker set.

This is exactly the Diagnosis Engine already scoped in the main spec; this doc is
the "build it ourselves" technical path.

## Why it's feasible now (the references the founder gathered)

- **Markerless golf pose** is an active, solved-enough research area:
  GolfPose (ICPR 2024) and related work extract joint kinematics from single- or
  multi-view golf video. [GolfPose](https://minghanlee.github.io/papers/ICPR_2024_GolfPose.pdf)
- **Open biomechanics data to calibrate against** exists and is licensed for use:
  [OpenBiomechanics](https://openbiomechanics.org) publishes real golf-swing
  biomechanics (force plates + motion capture) — a ground-truth set to validate a
  markerless pipeline against, so our phone-video numbers mean something.
- **Pose → parameters tooling** to lean on / learn from:
  [Pose2Par](https://github.com/cavanaulton/Pose2Par).
- **Additional method references** supplied:
  arXiv [1903.06528](https://ar5iv.labs.arxiv.org/html/1903.06528);
  [junheeeeeee golf project](https://junheeeeeee.github.io/projects/golf/).
- **Published swing biomechanics** for the fault/physics grounding:
  NLM/PMC [PMC9227529](https://pmc.ncbi.nlm.nih.gov/articles/PMC9227529/).

## Build path (honest sequencing)

1. **Capture (DONE).** The Video Combine already collects the standardized 8-shot,
   3-swing protocol with guided framing — the input this layer needs.
2. **Pose extraction.** Run an off-the-shelf pose model on the clips (on-device
   for framing feedback; server-side heavier model for the real read). Prove joint
   tracks are stable on Tom's own students' swings first.
3. **Kinematic features.** Derive the handful of measures Tom actually coaches —
   not 200 numbers. Validate them against the OpenBiomechanics ground truth so a
   phone-derived value tracks a lab-derived one within a stated tolerance.
4. **Tom's labels = the differentiator.** His golden set (from the extraction
   interviews) maps features → faults → fixes in HIS ranking. This is the part no
   competitor has and the reason to build rather than rent.
5. **Human-in-the-loop.** Low-confidence reads queue for Tom; his corrections are
   training data. Nothing ships under his name unreviewed.

## The honest gate

Steps 2–5 are real R&D (weeks to months), and step 4 is blocked on Tom's method
extraction — the same gate as the whole diagnosis engine. Until then the site
says exactly what's true: **capture works today; the automatic read in Tom's
method is in build.** We do not fake a biomechanics number.

## Build vs. rent

Renting (Swing Catalyst / Sportsbox) is faster to a demo and fine for in-person
lessons. Building our own layer is slower but is the durable asset: it runs on a
phone at consumer scale, it speaks in Tom's method, and the labelled-correction
corpus compounds. Recommendation: **rent in-person tooling now, build the
phone-video layer as the moat once Tom's method is captured.**

## The capture UX the founder wants (2026-09-02)

The phone is the camera. The whole loop, on the golfer's own device at a
simulator or the range:

1. **Auto-trigger.** The app watches the live camera and starts recording the
   instant it detects a swing (motion/audio onset) — no tapping record mid-setup.
2. **Instant loop replay.** The moment the swing finishes, it trims to just the
   swing and loops it — ideally overlaid on / beside the simulator screen so the
   golfer sees ball data and their motion together.
3. **One-tap submit.** Send the clip for analysis: the markerless read plus
   **Tom's expert diagnosis and a corrective strategy** in his voice.
4. **It comes back as coaching.** Not a chart dump — the one or two things to fix,
   the drill, and why, tracked against last time.

Buildable order: auto-trigger + trim + loop is a front-end/on-device capture
feature (achievable now, no AI moat needed). Submit → queue → **Tom reviews**
works today through the booking/membership relay. The *automatic* read is the
gated R&D above. So v1 can ship "record, loop, submit, Tom answers" while the
automatic biomechanics read matures behind it — honest and useful from day one.
