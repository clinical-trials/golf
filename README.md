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

Design phase. No implementation yet.

- **Design spec:** [docs/superpowers/specs/2026-08-22-golf-coaching-platform-design.md](docs/superpowers/specs/2026-08-22-golf-coaching-platform-design.md)

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
