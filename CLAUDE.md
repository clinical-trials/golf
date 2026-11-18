# Pocket Pro — Claude Code project guide

Golf coaching platform for PGA Professional **Tom Harris**. New here? Read
`HANDOFF.md` first — setup, branch model, architecture, what's built vs. pending,
and the go-live checklist. Roadmap sheet: "The Next 20" PDF in the handoff package.

## Ground rules (non-negotiable)

- **Nothing fabricated.** Data, testimonials, stats, imagery are real or clearly
  labeled sample/preview. Empty states over invented ones.
- **We do not sell golfer data.**
- **Everything in Tom's name is DRAFT until he reviews it** — curricula, prices,
  copy that speaks as him. Nothing ships unreviewed.
- **No third-party logos** — company names as text only. (The PGA Member seal was
  provided by Tom and is authorized.)
- **Real-student media is private.** `docs/media/` is gitignored; never publish or
  commit it. Use the anonymized "Jordan" stand-ins on anything public.
- **The $10 Student Cheat Sheet PDFs are a paid product** — they live outside the
  repo and are never committed; delivered to buyers only after payment.
- **Never archive the working directory with `zip -r`** (it would capture `.env`
  and private media). Use `git archive`.
- `POST /api/auth/session` issuance is dev-gated behind `DEV_AUTH=1` — never set
  that in production. It is the seam magic-link login replaces.

## Branches

- `version-4-final-draft` — ACTIVE. Push here and only here.
- `version-3` — frozen fallback; GitHub Pages currently serves it. Don't touch.
- `version-2` — legacy full-featured site, kept as add-back reference.
- `main` — fallback.

## Daily commands

```bash
pnpm install && pnpm exec prisma generate   # pnpm skips Prisma's postinstall
pnpm exec prisma db push                    # schema -> Postgres (no migrations dir)
pnpm exec vitest run                        # all tests must stay green
pnpm dev                                    # Next 15; TypeScript pinned to ^6 (TS7 breaks Next 15)
```

- `pnpm exec tsc --noEmit` lists ~23 pre-existing type errors (cleanup is roadmap
  item 13). `next dev` and the tests are unaffected.
- Tests share one database and every test resets it via `tests/reset.ts` — when you
  add a Prisma model, add it there in FK-safe order.

## Architecture in one breath

Framework-free business logic in `src/domain/*`; external services sit behind
**ports** (pattern: `src/domain/payments/port.ts` + Stub/Stripe implementations,
selected by env). Thin route handlers in `src/app/api/*`. Prisma schema in
`prisma/`. Static marketing site in `docs/` (GitHub Pages); its config objects at
the end of `docs/index.html` are the go-live switches. Mirror the payments-port
pattern for email/SMS (Twilio) when building comms.
