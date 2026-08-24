# Scheduling and Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a golfer see the pro's real availability, book a lesson, and pay for it — with payment behind a port so the product works end to end today on a stub and switches to live Stripe by swapping one implementation and adding credentials.

**Architecture:** Availability is stored as recurring weekly rules plus explicit exceptions, and free slots are *derived* rather than stored, so there is no table to keep in sync. Booking and payment are separated: a booking is held, then paid, then confirmed. Payments go through a `PaymentPort` with a `StubPayments` implementation used until Stripe credentials exist — the same pattern as `StoragePort` and `OcrPort` in the earlier plans.

**Tech Stack:** Next.js 15, TypeScript, Prisma 7 with the `@prisma/adapter-pg` driver adapter, PostgreSQL 16, Vitest, Zod.

## Global Constraints

- Requires the Foundation plan. Consumes `prisma`, `missingRequiredConsents`.
- Package manager is **pnpm**. Prisma commands run through `./node_modules/.bin/prisma`; connection config lives in `prisma.config.ts`, not the schema.
- **No secret keys in the repository.** Stripe configuration is read from environment variables only. `.env.example` documents the names with empty values.
- **No booking endpoint is reachable by a user with outstanding required consents.** Every route calls `missingRequiredConsents` first and returns 403 when non-empty.
- **All times are stored as UTC.** The pro's timezone is a property of the pro, applied at display time. Slot arithmetic never uses the server's local timezone.
- **Money is integer minor units** (cents). No floating point anywhere in a price.
- **The stub never claims a real charge.** `StubPayments` returns a clearly marked test reference and every record it creates carries `provider = 'STUB'`, so no report can mistake a stub booking for revenue.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/domain/schedule/availability.ts` | Weekly rules and exceptions. |
| `src/domain/schedule/slots.ts` | Pure: derive free slots from rules, exceptions and bookings. |
| `src/domain/schedule/booking.ts` | Hold, confirm, cancel. |
| `src/domain/payments/port.ts` | `PaymentPort` interface. |
| `src/domain/payments/stub.ts` | Works today, charges nothing. |
| `src/domain/payments/stripe.ts` | Real implementation, unused until credentials exist. |
| `src/domain/payments/checkout.ts` | Ties a booking to a payment intent. |
| `src/app/api/schedule/route.ts` | Read availability. |
| `src/app/api/bookings/route.ts` | Create and cancel bookings. |

---

### Task 1: Availability rules

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/schedule/availability.ts`
- Test: `tests/domain/schedule/availability.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`.
- Produces:
  - `setWeeklyRule(input: WeeklyRuleInput): Promise<AvailabilityRule>`
  - `WeeklyRuleInput` — `{ proId: string; weekday: number; startMinute: number; endMinute: number; slotMinutes: number }` where `weekday` is 0–6 with 0 = Sunday, and minutes are minutes from midnight in the pro's timezone
  - `addException(input: { proId: string; date: Date; blocked: boolean }): Promise<AvailabilityException>`
  - `listRules(proId: string): Promise<AvailabilityRule[]>`
  - `listExceptions(proId: string, from: Date, to: Date): Promise<AvailabilityException[]>`

- [ ] **Step 1: Write the failing test**

`tests/domain/schedule/availability.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { setWeeklyRule, addException, listRules, listExceptions } from '@/domain/schedule/availability'

async function makePro() {
  const user = await prisma.user.create({
    data: { email: `pro${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  return prisma.pro.create({
    data: { userId: user.id, displayName: 'Test Pro', timezone: 'America/Denver' },
  })
}

beforeEach(async () => {
  await prisma.availabilityException.deleteMany()
  await prisma.availabilityRule.deleteMany()
  await prisma.pro.deleteMany()
  await prisma.user.deleteMany()
})

describe('availability', () => {
  it('stores a weekly rule', async () => {
    const pro = await makePro()
    const rule = await setWeeklyRule({
      proId: pro.id, weekday: 2, startMinute: 540, endMinute: 780, slotMinutes: 60,
    })
    expect(rule.weekday).toBe(2)
    expect(rule.startMinute).toBe(540)
  })

  it('replaces a rule for the same weekday rather than duplicating it', async () => {
    const pro = await makePro()
    await setWeeklyRule({ proId: pro.id, weekday: 2, startMinute: 540, endMinute: 780, slotMinutes: 60 })
    await setWeeklyRule({ proId: pro.id, weekday: 2, startMinute: 600, endMinute: 840, slotMinutes: 45 })

    const rules = await listRules(pro.id)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.startMinute).toBe(600)
    expect(rules[0]?.slotMinutes).toBe(45)
  })

  it('rejects an end before a start', async () => {
    const pro = await makePro()
    await expect(
      setWeeklyRule({ proId: pro.id, weekday: 1, startMinute: 780, endMinute: 540, slotMinutes: 60 }),
    ).rejects.toThrow(/end/i)
  })

  it('rejects a weekday outside 0 to 6', async () => {
    const pro = await makePro()
    await expect(
      setWeeklyRule({ proId: pro.id, weekday: 7, startMinute: 540, endMinute: 780, slotMinutes: 60 }),
    ).rejects.toThrow(/weekday/i)
  })

  it('records a blocked day and finds it in range', async () => {
    const pro = await makePro()
    await addException({ proId: pro.id, date: new Date('2026-09-03T00:00:00Z'), blocked: true })

    const found = await listExceptions(pro.id, new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'))
    expect(found).toHaveLength(1)
    expect(found[0]?.blocked).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/domain/schedule/availability.test.ts`
Expected: FAIL — cannot resolve `@/domain/schedule/availability`.

- [ ] **Step 3: Extend the schema**

```prisma
model Pro {
  id          String  @id @default(cuid())
  userId      String  @unique
  user        User    @relation("UserPro", fields: [userId], references: [id])
  displayName String
  timezone    String  @default("UTC")
  rules       AvailabilityRule[]
  exceptions  AvailabilityException[]
  bookings    Booking[]
  products    LessonProduct[]
}

model AvailabilityRule {
  id          String @id @default(cuid())
  proId       String
  pro         Pro    @relation(fields: [proId], references: [id], onDelete: Cascade)
  weekday     Int
  startMinute Int
  endMinute   Int
  slotMinutes Int

  @@unique([proId, weekday])
}

model AvailabilityException {
  id      String   @id @default(cuid())
  proId   String
  pro     Pro      @relation(fields: [proId], references: [id], onDelete: Cascade)
  date    DateTime @db.Date
  blocked Boolean

  @@unique([proId, date])
}
```

Add to `User`:

```prisma
  pro Pro? @relation("UserPro")
```

- [ ] **Step 4: Write the module**

`src/domain/schedule/availability.ts`:

```ts
import { prisma } from '@/lib/db'
import type { AvailabilityException, AvailabilityRule } from '@prisma/client'

export interface WeeklyRuleInput {
  proId: string
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
}

export async function setWeeklyRule(input: WeeklyRuleInput): Promise<AvailabilityRule> {
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
    throw new Error(`weekday must be an integer from 0 to 6, received ${input.weekday}`)
  }
  if (input.endMinute <= input.startMinute) {
    throw new Error('end must be after start')
  }
  if (input.slotMinutes <= 0) {
    throw new Error('slotMinutes must be positive')
  }

  const { proId, weekday, ...rest } = input
  return prisma.availabilityRule.upsert({
    where: { proId_weekday: { proId, weekday } },
    update: rest,
    create: input,
  })
}

export async function addException(input: {
  proId: string
  date: Date
  blocked: boolean
}): Promise<AvailabilityException> {
  return prisma.availabilityException.upsert({
    where: { proId_date: { proId: input.proId, date: input.date } },
    update: { blocked: input.blocked },
    create: input,
  })
}

export async function listRules(proId: string): Promise<AvailabilityRule[]> {
  return prisma.availabilityRule.findMany({ where: { proId }, orderBy: { weekday: 'asc' } })
}

export async function listExceptions(
  proId: string,
  from: Date,
  to: Date,
): Promise<AvailabilityException[]> {
  return prisma.availabilityException.findMany({
    where: { proId, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
./node_modules/.bin/prisma db push && ./node_modules/.bin/vitest run tests/domain/schedule/availability.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/schedule tests/domain/schedule
git commit -m "feat: pro availability rules and exceptions"
```

---

### Task 2: Deriving free slots

Pure function, no database. This is where the scheduling logic actually lives.

**Files:**
- Create: `src/domain/schedule/slots.ts`
- Test: `tests/domain/schedule/slots.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `deriveSlots(input: DeriveSlotsInput): Slot[]`
  - `DeriveSlotsInput` — `{ rules: RuleShape[]; exceptions: ExceptionShape[]; taken: { startsAt: Date; endsAt: Date }[]; from: Date; to: Date; timezoneOffsetMinutes: number }`
  - `RuleShape` — `{ weekday: number; startMinute: number; endMinute: number; slotMinutes: number }`
  - `ExceptionShape` — `{ date: Date; blocked: boolean }`
  - `Slot` — `{ startsAt: Date; endsAt: Date }`

`timezoneOffsetMinutes` is passed in rather than derived, so this function stays pure and testable without a timezone database.

- [ ] **Step 1: Write the failing test**

`tests/domain/schedule/slots.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveSlots } from '@/domain/schedule/slots'

const MONDAY_RULE = { weekday: 1, startMinute: 540, endMinute: 720, slotMinutes: 60 }

// Monday 2026-09-07 through Tuesday 2026-09-08, UTC for simplicity.
const from = new Date('2026-09-07T00:00:00Z')
const to = new Date('2026-09-09T00:00:00Z')

describe('deriveSlots', () => {
  it('produces one slot per interval inside the rule', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(3)
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T09:00:00.000Z')
    expect(slots[2]?.endsAt.toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })

  it('produces nothing for a weekday with no rule', () => {
    const slots = deriveSlots({
      rules: [{ ...MONDAY_RULE, weekday: 4 }], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(0)
  })

  it('drops every slot on a blocked day', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [{ date: new Date('2026-09-07T00:00:00Z'), blocked: true }],
      taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(0)
  })

  it('drops a slot that overlaps an existing booking', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [{ startsAt: new Date('2026-09-07T10:00:00Z'), endsAt: new Date('2026-09-07T11:00:00Z') }],
      from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual([
      '2026-09-07T09:00:00.000Z',
      '2026-09-07T11:00:00.000Z',
    ])
  })

  it('drops a slot that only partially overlaps a booking', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [{ startsAt: new Date('2026-09-07T10:30:00Z'), endsAt: new Date('2026-09-07T10:45:00Z') }],
      from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(2)
  })

  it('shifts slot times by the pro timezone offset', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: -360,
    })
    // 09:00 local at UTC-6 is 15:00 UTC.
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T15:00:00.000Z')
  })

  it('never returns a slot outside the requested window', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [],
      from: new Date('2026-09-07T10:00:00Z'),
      to: new Date('2026-09-07T11:00:00Z'),
      timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T10:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/domain/schedule/slots.test.ts`
Expected: FAIL — cannot resolve `@/domain/schedule/slots`.

- [ ] **Step 3: Write the module**

`src/domain/schedule/slots.ts`:

```ts
export interface RuleShape {
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
}

export interface ExceptionShape {
  date: Date
  blocked: boolean
}

export interface Slot {
  startsAt: Date
  endsAt: Date
}

export interface DeriveSlotsInput {
  rules: RuleShape[]
  exceptions: ExceptionShape[]
  taken: { startsAt: Date; endsAt: Date }[]
  from: Date
  to: Date
  timezoneOffsetMinutes: number
}

const DAY_MS = 24 * 60 * 60 * 1000

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

const overlaps = (a: Slot, b: { startsAt: Date; endsAt: Date }) =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt

export function deriveSlots(input: DeriveSlotsInput): Slot[] {
  const blocked = new Set(
    input.exceptions.filter((e) => e.blocked).map((e) => dayKey(e.date)),
  )

  const slots: Slot[] = []
  const firstDay = new Date(Date.UTC(
    input.from.getUTCFullYear(), input.from.getUTCMonth(), input.from.getUTCDate(),
  ))

  for (let cursor = firstDay.getTime(); cursor < input.to.getTime(); cursor += DAY_MS) {
    const day = new Date(cursor)
    if (blocked.has(dayKey(day))) continue

    for (const rule of input.rules) {
      if (rule.weekday !== day.getUTCDay()) continue

      for (let m = rule.startMinute; m + rule.slotMinutes <= rule.endMinute; m += rule.slotMinutes) {
        const startsAt = new Date(cursor + (m - input.timezoneOffsetMinutes) * 60_000)
        const endsAt = new Date(startsAt.getTime() + rule.slotMinutes * 60_000)

        if (startsAt < input.from || endsAt > input.to) continue
        if (input.taken.some((t) => overlaps({ startsAt, endsAt }, t))) continue

        slots.push({ startsAt, endsAt })
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `./node_modules/.bin/vitest run tests/domain/schedule/slots.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/schedule/slots.ts tests/domain/schedule/slots.test.ts
git commit -m "feat: derive free lesson slots from rules, exceptions and bookings"
```

---

### Task 3: Payment port with a working stub

**Files:**
- Create: `src/domain/payments/port.ts`
- Create: `src/domain/payments/stub.ts`
- Test: `tests/domain/payments/stub.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PaymentPort` — `{ readonly provider: PaymentProvider; createIntent(input: CreateIntentInput): Promise<PaymentIntentResult>; capture(reference: string): Promise<PaymentOutcome>; refund(reference: string): Promise<PaymentOutcome> }`
  - `CreateIntentInput` — `{ amountMinor: number; currency: string; description: string; metadata?: Record<string, string> }`
  - `PaymentIntentResult` — `{ reference: string; clientSecret: string | null; provider: PaymentProvider }`
  - `PaymentOutcome` — `{ reference: string; status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED'; message: string }`
  - `PaymentProvider` = `'STUB' | 'STRIPE'`
  - `StubPayments` — implements `PaymentPort`, charges nothing

- [ ] **Step 1: Write the failing test**

`tests/domain/payments/stub.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { StubPayments } from '@/domain/payments/stub'

describe('stub payments', () => {
  it('identifies itself as the stub provider', () => {
    expect(new StubPayments().provider).toBe('STUB')
  })

  it('returns a reference that is obviously not a real charge', async () => {
    const intent = await new StubPayments().createIntent({
      amountMinor: 12000, currency: 'usd', description: 'One hour lesson',
    })
    expect(intent.reference).toMatch(/^stub_/)
    expect(intent.provider).toBe('STUB')
    expect(intent.clientSecret).toBeNull()
  })

  it('rejects a non-integer amount', async () => {
    await expect(
      new StubPayments().createIntent({ amountMinor: 120.5, currency: 'usd', description: 'x' }),
    ).rejects.toThrow(/minor units/i)
  })

  it('rejects a zero or negative amount', async () => {
    await expect(
      new StubPayments().createIntent({ amountMinor: 0, currency: 'usd', description: 'x' }),
    ).rejects.toThrow(/positive/i)
  })

  it('captures and refunds a reference it issued', async () => {
    const payments = new StubPayments()
    const intent = await payments.createIntent({ amountMinor: 12000, currency: 'usd', description: 'x' })

    const captured = await payments.capture(intent.reference)
    expect(captured.status).toBe('SUCCEEDED')
    expect(captured.message).toMatch(/no money/i)

    const refunded = await payments.refund(intent.reference)
    expect(refunded.status).toBe('REFUNDED')
  })

  it('refuses to capture a reference it never issued', async () => {
    await expect(new StubPayments().capture('stub_nope')).rejects.toThrow(/unknown/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/domain/payments/stub.test.ts`
Expected: FAIL — cannot resolve `@/domain/payments/stub`.

- [ ] **Step 3: Write the port**

`src/domain/payments/port.ts`:

```ts
export type PaymentProvider = 'STUB' | 'STRIPE'

export interface CreateIntentInput {
  amountMinor: number
  currency: string
  description: string
  metadata?: Record<string, string>
}

export interface PaymentIntentResult {
  reference: string
  clientSecret: string | null
  provider: PaymentProvider
}

export interface PaymentOutcome {
  reference: string
  status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
  message: string
}

export interface PaymentPort {
  readonly provider: PaymentProvider
  createIntent(input: CreateIntentInput): Promise<PaymentIntentResult>
  capture(reference: string): Promise<PaymentOutcome>
  refund(reference: string): Promise<PaymentOutcome>
}

export function assertValidAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Amount must be an integer in minor units, for example 12000 for $120.00')
  }
  if (amountMinor <= 0) {
    throw new Error('Amount must be positive')
  }
}
```

- [ ] **Step 4: Write the stub**

`src/domain/payments/stub.ts`:

```ts
import { assertValidAmount } from './port'
import type { CreateIntentInput, PaymentIntentResult, PaymentOutcome, PaymentPort } from './port'

/**
 * Takes no money and pretends nothing. Every reference is prefixed `stub_` and
 * every outcome says so in plain words, so a stub booking can never be mistaken
 * for revenue in a report.
 */
export class StubPayments implements PaymentPort {
  readonly provider = 'STUB' as const

  private issued = new Map<string, CreateIntentInput>()
  private counter = 0

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    assertValidAmount(input.amountMinor)
    const reference = `stub_${++this.counter}_${input.amountMinor}${input.currency}`
    this.issued.set(reference, input)
    return { reference, clientSecret: null, provider: this.provider }
  }

  async capture(reference: string): Promise<PaymentOutcome> {
    if (!this.issued.has(reference)) throw new Error(`Unknown payment reference ${reference}`)
    return { reference, status: 'SUCCEEDED', message: 'Stub payment — no money moved' }
  }

  async refund(reference: string): Promise<PaymentOutcome> {
    if (!this.issued.has(reference)) throw new Error(`Unknown payment reference ${reference}`)
    return { reference, status: 'REFUNDED', message: 'Stub refund — no money moved' }
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `./node_modules/.bin/vitest run tests/domain/payments/stub.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain/payments tests/domain/payments
git commit -m "feat: payment port with a stub that never claims a real charge"
```

---

### Task 4: Stripe implementation, dormant until credentials exist

**Files:**
- Create: `src/domain/payments/stripe.ts`
- Create: `src/lib/payments.ts`
- Modify: `.env.example`
- Test: `tests/domain/payments/selection.test.ts`

**Interfaces:**
- Consumes: `PaymentPort` from `./port`, `StubPayments` from `./stub`.
- Produces:
  - `StripePayments` — implements `PaymentPort`, constructed with `new StripePayments(secretKey)`
  - `selectPaymentPort(env: Record<string, string | undefined>): PaymentPort` — returns Stripe when `STRIPE_SECRET_KEY` is present, the stub otherwise
  - `payments` — the singleton exported from `src/lib/payments.ts`

- [ ] **Step 1: Write the failing test**

`tests/domain/payments/selection.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { selectPaymentPort } from '@/domain/payments/stripe'

describe('payment port selection', () => {
  it('uses the stub when no Stripe key is configured', () => {
    expect(selectPaymentPort({}).provider).toBe('STUB')
  })

  it('uses the stub when the key is blank', () => {
    expect(selectPaymentPort({ STRIPE_SECRET_KEY: '   ' }).provider).toBe('STUB')
  })

  it('uses Stripe once a key is present', () => {
    expect(selectPaymentPort({ STRIPE_SECRET_KEY: 'sk_test_example' }).provider).toBe('STRIPE')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/domain/payments/selection.test.ts`
Expected: FAIL — cannot resolve `@/domain/payments/stripe`.

- [ ] **Step 3: Install the SDK and write the implementation**

```bash
pnpm add stripe
```

`src/domain/payments/stripe.ts`:

```ts
import Stripe from 'stripe'
import { assertValidAmount } from './port'
import type { CreateIntentInput, PaymentIntentResult, PaymentOutcome, PaymentPort } from './port'
import { StubPayments } from './stub'

export class StripePayments implements PaymentPort {
  readonly provider = 'STRIPE' as const

  private client: Stripe

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey)
  }

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    assertValidAmount(input.amountMinor)
    const intent = await this.client.paymentIntents.create({
      amount: input.amountMinor,
      currency: input.currency,
      description: input.description,
      metadata: input.metadata,
      capture_method: 'manual',
    })
    return { reference: intent.id, clientSecret: intent.client_secret, provider: this.provider }
  }

  async capture(reference: string): Promise<PaymentOutcome> {
    const intent = await this.client.paymentIntents.capture(reference)
    return {
      reference,
      status: intent.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
      message: `Stripe payment intent ${intent.status}`,
    }
  }

  async refund(reference: string): Promise<PaymentOutcome> {
    const refund = await this.client.refunds.create({ payment_intent: reference })
    return {
      reference,
      status: refund.status === 'succeeded' ? 'REFUNDED' : 'FAILED',
      message: `Stripe refund ${refund.status}`,
    }
  }
}

/**
 * Stripe when a key is configured, the stub otherwise. Adding credentials is
 * the only step needed to take real payments — no code changes.
 */
export function selectPaymentPort(env: Record<string, string | undefined>): PaymentPort {
  const key = env.STRIPE_SECRET_KEY?.trim()
  return key ? new StripePayments(key) : new StubPayments()
}
```

`src/lib/payments.ts`:

```ts
import 'dotenv/config'
import { selectPaymentPort } from '@/domain/payments/stripe'

export const payments = selectPaymentPort(process.env)
```

- [ ] **Step 4: Document the variables**

Append to `.env.example`. Names only — never a value.

```
# Payments. Leave blank to run on the stub, which takes no money.
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PUBLISHABLE_KEY=""
```

- [ ] **Step 5: Run it and watch it pass**

Run: `./node_modules/.bin/vitest run tests/domain/payments/selection.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain/payments/stripe.ts src/lib/payments.ts .env.example package.json pnpm-lock.yaml tests/domain/payments/selection.test.ts
git commit -m "feat: Stripe payment implementation selected by env, stub by default"
```

---

### Task 5: Booking a lesson

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/schedule/booking.ts`
- Test: `tests/domain/schedule/booking.test.ts`

**Interfaces:**
- Consumes: `prisma`, `deriveSlots`, `PaymentPort`.
- Produces:
  - `holdBooking(input: HoldBookingInput): Promise<Booking>`
  - `HoldBookingInput` — `{ userId: string; proId: string; productId: string; startsAt: Date; payments: PaymentPort }`
  - `confirmBooking(input: { bookingId: string; payments: PaymentPort }): Promise<Booking>`
  - `cancelBooking(input: { bookingId: string; payments: PaymentPort }): Promise<Booking>`

- [ ] **Step 1: Write the failing test**

`tests/domain/schedule/booking.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'
import { holdBooking, confirmBooking, cancelBooking } from '@/domain/schedule/booking'

async function fixtures() {
  const proUser = await prisma.user.create({
    data: { email: `pro${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  const pro = await prisma.pro.create({
    data: { userId: proUser.id, displayName: 'Test Pro', timezone: 'UTC' },
  })
  const product = await prisma.lessonProduct.create({
    data: { proId: pro.id, name: 'One hour lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
  })
  const student = await prisma.user.create({
    data: { email: `s${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  return { pro, product, student }
}

beforeEach(async () => {
  await prisma.booking.deleteMany()
  await prisma.lessonProduct.deleteMany()
  await prisma.pro.deleteMany()
  await prisma.user.deleteMany()
})

describe('booking', () => {
  it('holds a booking with a payment reference and no charge yet', async () => {
    const { pro, product, student } = await fixtures()
    const booking = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments: new StubPayments(),
    })

    expect(booking.status).toBe('HELD')
    expect(booking.paymentProvider).toBe('STUB')
    expect(booking.paymentReference).toMatch(/^stub_/)
    expect(booking.priceMinor).toBe(12000)
  })

  it('derives the end time from the product length', async () => {
    const { pro, product, student } = await fixtures()
    const booking = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments: new StubPayments(),
    })
    expect(booking.endsAt.toISOString()).toBe('2026-09-07T16:00:00.000Z')
  })

  it('refuses to double-book the same time', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const at = new Date('2026-09-07T15:00:00Z')
    await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })

    await expect(
      holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments }),
    ).rejects.toThrow(/already booked/i)
  })

  it('refuses a booking that overlaps an existing one', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments,
    })

    await expect(
      holdBooking({
        userId: student.id, proId: pro.id, productId: product.id,
        startsAt: new Date('2026-09-07T15:30:00Z'), payments,
      }),
    ).rejects.toThrow(/already booked/i)
  })

  it('confirms a held booking', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const held = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments,
    })

    const confirmed = await confirmBooking({ bookingId: held.id, payments })
    expect(confirmed.status).toBe('CONFIRMED')
  })

  it('cancels a booking and frees the slot', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const at = new Date('2026-09-07T15:00:00Z')
    const held = await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })

    const cancelled = await cancelBooking({ bookingId: held.id, payments })
    expect(cancelled.status).toBe('CANCELLED')

    const rebooked = await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })
    expect(rebooked.status).toBe('HELD')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/domain/schedule/booking.test.ts`
Expected: FAIL — cannot resolve `@/domain/schedule/booking`.

- [ ] **Step 3: Extend the schema**

```prisma
enum BookingStatus { HELD CONFIRMED CANCELLED }

enum PaymentProviderKind { STUB STRIPE }

model LessonProduct {
  id         String    @id @default(cuid())
  proId      String
  pro        Pro       @relation(fields: [proId], references: [id], onDelete: Cascade)
  name       String
  minutes    Int
  priceMinor Int
  currency   String    @default("usd")
  bookings   Booking[]
}

model Booking {
  id               String              @id @default(cuid())
  userId           String
  user             User                @relation("UserBookings", fields: [userId], references: [id])
  proId            String
  pro              Pro                 @relation(fields: [proId], references: [id])
  productId        String
  product          LessonProduct       @relation(fields: [productId], references: [id])
  startsAt         DateTime
  endsAt           DateTime
  status           BookingStatus       @default(HELD)
  priceMinor       Int
  currency         String
  paymentProvider  PaymentProviderKind
  paymentReference String
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  @@index([proId, startsAt])
}
```

Add to `User`:

```prisma
  bookings Booking[] @relation("UserBookings")
```

- [ ] **Step 4: Write the module**

`src/domain/schedule/booking.ts`:

```ts
import { prisma } from '@/lib/db'
import type { Booking } from '@prisma/client'
import type { PaymentPort } from '@/domain/payments/port'

export interface HoldBookingInput {
  userId: string
  proId: string
  productId: string
  startsAt: Date
  payments: PaymentPort
}

export async function holdBooking(input: HoldBookingInput): Promise<Booking> {
  const product = await prisma.lessonProduct.findUniqueOrThrow({ where: { id: input.productId } })
  const endsAt = new Date(input.startsAt.getTime() + product.minutes * 60_000)

  const clash = await prisma.booking.findFirst({
    where: {
      proId: input.proId,
      status: { in: ['HELD', 'CONFIRMED'] },
      startsAt: { lt: endsAt },
      endsAt: { gt: input.startsAt },
    },
  })
  if (clash) throw new Error('That time is already booked')

  const intent = await input.payments.createIntent({
    amountMinor: product.priceMinor,
    currency: product.currency,
    description: product.name,
    metadata: { proId: input.proId, productId: product.id },
  })

  return prisma.booking.create({
    data: {
      userId: input.userId,
      proId: input.proId,
      productId: product.id,
      startsAt: input.startsAt,
      endsAt,
      priceMinor: product.priceMinor,
      currency: product.currency,
      paymentProvider: intent.provider,
      paymentReference: intent.reference,
    },
  })
}

export async function confirmBooking(input: {
  bookingId: string
  payments: PaymentPort
}): Promise<Booking> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } })
  if (booking.status !== 'HELD') throw new Error(`Cannot confirm a booking that is ${booking.status}`)

  const outcome = await input.payments.capture(booking.paymentReference)
  if (outcome.status !== 'SUCCEEDED') throw new Error(`Payment did not succeed: ${outcome.message}`)

  return prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } })
}

export async function cancelBooking(input: {
  bookingId: string
  payments: PaymentPort
}): Promise<Booking> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } })
  if (booking.status === 'CANCELLED') return booking

  if (booking.status === 'CONFIRMED') {
    await input.payments.refund(booking.paymentReference)
  }

  return prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
./node_modules/.bin/prisma db push && ./node_modules/.bin/vitest run tests/domain/schedule/booking.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/schedule/booking.ts tests/domain/schedule/booking.test.ts
git commit -m "feat: hold, confirm and cancel lesson bookings"
```

---

### Task 6: Consent-gated scheduling API

**Files:**
- Create: `src/app/api/schedule/route.ts`
- Create: `src/app/api/bookings/route.ts`
- Test: `tests/app/api/schedule.test.ts`

**Interfaces:**
- Consumes: `missingRequiredConsents`, `deriveSlots`, `listRules`, `listExceptions`, `holdBooking`, `cancelBooking`, `payments`.
- Produces: `GET /api/schedule?proId=&from=&to=` → `{ slots: {startsAt,endsAt}[] }`; `POST /api/bookings` → `{ bookingId, status, paymentProvider, clientSecret }`; `DELETE /api/bookings?bookingId=`.

- [ ] **Step 1: Write the failing test**

`tests/app/api/schedule.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'

vi.mock('@/lib/payments', () => ({ payments: new StubPayments() }))

const { GET: getSchedule } = await import('@/app/api/schedule/route')
const { POST: postBooking } = await import('@/app/api/bookings/route')

async function consented(email: string) {
  const user = await prisma.user.create({ data: { email, dateOfBirth: new Date('1985-01-01') } })
  const docs = await prisma.consentDocument.findMany({ where: { required: true } })
  for (const doc of docs) {
    if (doc.kind === 'MINOR_PARENTAL') continue
    await prisma.consentAcceptance.create({ data: { userId: user.id, documentId: doc.id } })
  }
  return user
}

beforeEach(async () => {
  await prisma.booking.deleteMany()
  await prisma.lessonProduct.deleteMany()
  await prisma.availabilityRule.deleteMany()
  await prisma.pro.deleteMany()
  await prisma.consentAcceptance.deleteMany()
  await prisma.consentDocument.deleteMany()
  await prisma.user.deleteMany()
  for (const kind of ['WAIVER', 'HEALTH_ATTESTATION', 'ON_COURSE_DISCLAIMER'] as const) {
    await prisma.consentDocument.create({
      data: { kind, version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
  }
})

describe('scheduling API', () => {
  it('lists free slots for a pro', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p1@example.com' } })
    const pro = await prisma.pro.create({
      data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' },
    })
    await prisma.availabilityRule.create({
      data: { proId: pro.id, weekday: 1, startMinute: 540, endMinute: 720, slotMinutes: 60 },
    })

    const res = await getSchedule(
      new Request(`http://t/api/schedule?proId=${pro.id}&from=2026-09-07T00:00:00Z&to=2026-09-09T00:00:00Z`),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.slots).toHaveLength(3)
  })

  it('refuses a booking from a user with outstanding consents', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p2@example.com' } })
    const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' } })
    const product = await prisma.lessonProduct.create({
      data: { proId: pro.id, name: 'Lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
    })
    const blocked = await prisma.user.create({ data: { email: 'blocked2@example.com' } })

    const res = await postBooking(
      new Request('http://t/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          userId: blocked.id, proId: pro.id, productId: product.id, startsAt: '2026-09-07T15:00:00Z',
        }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('books for a consented user and reports the stub provider', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p3@example.com' } })
    const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' } })
    const product = await prisma.lessonProduct.create({
      data: { proId: pro.id, name: 'Lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
    })
    const student = await consented('ok3@example.com')

    const res = await postBooking(
      new Request('http://t/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          userId: student.id, proId: pro.id, productId: product.id, startsAt: '2026-09-07T15:00:00Z',
        }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.paymentProvider).toBe('STUB')
    expect(body.status).toBe('HELD')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `./node_modules/.bin/vitest run tests/app/api/schedule.test.ts`
Expected: FAIL — cannot resolve `@/app/api/schedule/route`.

- [ ] **Step 3: Write the routes**

`src/app/api/schedule/route.ts`:

```ts
import { prisma } from '@/lib/db'
import { deriveSlots } from '@/domain/schedule/slots'
import { listRules, listExceptions } from '@/domain/schedule/availability'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const proId = params.get('proId')
  const from = params.get('from')
  const to = params.get('to')
  if (!proId || !from || !to) {
    return Response.json({ error: 'proId, from and to are required' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return Response.json({ error: 'from and to must be ISO timestamps' }, { status: 400 })
  }

  const pro = await prisma.pro.findUnique({ where: { id: proId } })
  if (!pro) return Response.json({ error: 'pro not found' }, { status: 404 })

  const [rules, exceptions, taken] = await Promise.all([
    listRules(proId),
    listExceptions(proId, fromDate, toDate),
    prisma.booking.findMany({
      where: { proId, status: { in: ['HELD', 'CONFIRMED'] }, startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  const slots = deriveSlots({
    rules, exceptions, taken, from: fromDate, to: toDate, timezoneOffsetMinutes: 0,
  })

  return Response.json({ slots })
}
```

`src/app/api/bookings/route.ts`:

```ts
import { z } from 'zod'
import { payments } from '@/lib/payments'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { holdBooking, cancelBooking } from '@/domain/schedule/booking'

const postSchema = z.object({
  userId: z.string().min(1),
  proId: z.string().min(1),
  productId: z.string().min(1),
  startsAt: z.string().datetime(),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const input = parsed.data
  const missing = await missingRequiredConsents(input.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  try {
    const booking = await holdBooking({
      userId: input.userId,
      proId: input.proId,
      productId: input.productId,
      startsAt: new Date(input.startsAt),
      payments,
    })
    return Response.json({
      bookingId: booking.id,
      status: booking.status,
      paymentProvider: booking.paymentProvider,
      priceMinor: booking.priceMinor,
      currency: booking.currency,
    })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 })
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const bookingId = new URL(request.url).searchParams.get('bookingId')
  if (!bookingId) return Response.json({ error: 'bookingId is required' }, { status: 400 })

  const booking = await cancelBooking({ bookingId, payments })
  return Response.json({ bookingId: booking.id, status: booking.status })
}
```

- [ ] **Step 4: Run the whole suite**

Run: `./node_modules/.bin/vitest run`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/schedule src/app/api/bookings tests/app/api/schedule.test.ts
git commit -m "feat: consent-gated scheduling and booking API"
```

---

## Done when

- `./node_modules/.bin/vitest run` passes.
- A golfer can read real free slots, hold a booking, and cancel it, with no Stripe account in existence.
- Adding `STRIPE_SECRET_KEY` to the environment switches to live payments with no code change.
- No booking made on the stub can be mistaken for revenue: every one carries `provider = STUB` and a `stub_` reference.
- No secret key appears anywhere in the repository.
