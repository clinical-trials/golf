# Tom Harris — business card (print package)

**Status: DRAFT pending Tom Harris's review** (contact details, the free-lesson
offer, and PGA mark usage are his to sign off before printing).

## Files

- `tom-harris-business-card.pdf` — the print file, no photo. Page 1 front, page 2 back.
- `tom-harris-business-card-photo.pdf` — same card with Tom's portrait on the
  back beside the free-lesson CTA. Pick one; both share the same front.
- `tom-harris-business-card-portrait.pdf` / `-portrait-photo.pdf` — the same
  pair in vertical (portrait) orientation: trim 2" x 3.5", page 2.25" x 3.75".
- `business-card.html` / `business-card-photo.html` /
  `business-card-portrait.html` / `business-card-portrait-photo.html` — the
  sources. Edit, then re-render (below; swap filenames per variant).
- `tom-portrait.png` — circular portrait cropped from `docs/img/cred-pga-award.jpg`
  (Tom's GRAA award photo, used with the pro's involvement — see docs/img/README.md).
- `qr-coach-cute.svg` — styled QR → Tom's CoachNow facility (error correction
  level H; machine-decode-verified at print resolution, flag badge included).
- `pga-white-hires.png` — official PGA of America mark, white reverse, extracted
  at 600 dpi from the official PGA Logo Guidelines PDF (790×716). Trademark of
  the PGA of America; used per Tom's active Class A membership.

## Print spec (FedEx Office / Kinkos or any shop)

- Standard 3.5" × 2" business card, **bleed included** — the file is
  3.75" × 2.25" (trim 1/8" per side). No crop marks; the shop imposes.
- All vector except the PGA mark (1260 dpi effective) — any stock works.
  Suggested: 14–16 pt cardstock, matte or soft-touch.

## Re-render after edits

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=tom-harris-business-card.pdf business-card.html
```

## Guardrails honored (see repo CLAUDE.md + docs/img/README.md)

- PGA Brand Guide: white-reverse treatment, 0.625" minimum logo width,
  "P"-width clear space, artwork unaltered.
- Every fact on the card comes from the live site's own configured data
  (email, YouTube, Austin, CoachNow link, credentials). "Book a free lesson"
  matches the site's Start-free tier.
- If the QR destination ever changes, regenerate the SVG and re-verify it
  decodes — never swap the URL without re-testing the artwork.
