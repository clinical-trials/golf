# Foundation and Extraction Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the project scaffold, the Player Model schema, and the consent and compliance layer that must exist before any user touches the product — plus the method-extraction interview kit that unblocks the pro sessions on the critical path.

**Architecture:** A Next.js 15 App Router application in TypeScript, with Postgres accessed through Prisma. Domain logic lives in `src/domain/<area>/` as plain functions over Prisma, kept free of HTTP concerns so it is directly unit-testable. Consent is modelled as versioned immutable documents plus append-only acceptance records; a single gate function is the one place that decides whether a user may proceed.

**Tech Stack:** Next.js 15 (App Router), TypeScript 5, Prisma 6, PostgreSQL 16, Vitest, Zod, pnpm.

## Global Constraints

- Package manager is **pnpm**. Never `npm install`.
- All domain logic is in `src/domain/`. Route handlers in `src/app/api/` contain no business logic — they parse, call a domain function, and serialise.
- Every Prisma model uses `cuid()` string ids.
- Consent acceptance records are **append-only**. No code path may update or delete a row in `ConsentAcceptance`.
- All user-facing legal copy is marked `DRAFT — PENDING ATTORNEY REVIEW` until a licensed attorney clears it. This string appears in the seeded document bodies and must not be removed by any task in this plan.
- Video and round data are personal data. Secondary-use consent is **separable**: a user who declines it must still be able to use the product.
- Tests use Vitest. Run with `pnpm test`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `docs/method-extraction/interview-protocol.md` | The kit the pro sits down with. Not code. |
| `docs/method-extraction/capture-checklist.md` | Recording, transcription, and golden-set logistics. |
| `prisma/schema.prisma` | All models. |
| `prisma/seed.ts` | Seeds consent documents v1. |
| `src/domain/player/types.ts` | Player Model enums and TypeScript types. |
| `src/domain/player/profile.ts` | Create and read player profiles. |
| `src/domain/consent/documents.ts` | Fetch current version of each consent document. |
| `src/domain/consent/acceptance.ts` | Record acceptances. Append-only. |
| `src/domain/consent/gate.ts` | `missingRequiredConsents()` — the single authority on access. |
| `src/domain/consent/health.ts` | PAR-Q health attestation scoring and referral. |
| `src/app/api/consent/route.ts` | HTTP surface for consent. |
| `src/lib/db.ts` | Prisma client singleton. |
| `tests/` | Mirrors `src/`. |

---

### Task 1: Method-extraction interview kit

The critical-path deliverable. No code — this is what gets the pro in a room this week.

**Files:**
- Create: `docs/method-extraction/interview-protocol.md`
- Create: `docs/method-extraction/capture-checklist.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the vocabulary that Task 3's `FaultCode` enum and all later Method Model work will be built from. No code depends on it at compile time.

- [ ] **Step 1: Write the interview protocol**

Create `docs/method-extraction/interview-protocol.md` with these six sessions. Each question is asked verbatim and the answer recorded.

```markdown
# Method Extraction — Interview Protocol

Recorded and transcribed. Six sessions, roughly 90 minutes each.
Goal: convert the pro's system into a fault taxonomy, a drill library,
archetype definitions, prescription decision rules, and a labelled golden set.

## Session 1 — Fault taxonomy

1. When a golfer walks up and hits three balls, what are the first three things
   you look at, in order?
2. List every fault you diagnose regularly. Use your own words, not textbook words.
3. For each fault: what does it look like face-on? What does it look like
   down-the-line? What does the ball do?
4. Which faults are causes and which are symptoms of another fault on this list?
5. If a golfer has three of these at once, in what order do you fix them, and why?

## Session 2 — Player archetypes

1. Describe the kinds of golfers you see. Sort them into groups however you
   naturally do it.
2. For each group: what do you do differently with them?
3. Which group are you best with? Which group do you find hardest?
4. What do you refuse to teach a beginner that you would teach a 10-handicap?
5. Where does age or physical limitation change the fix rather than the explanation?
6. How do you tell, in the first ten minutes, whether someone needs feel or mechanics?

## Session 3 — Prescription rules

1. Take fault #1 from Session 1. Every drill you would ever use for it.
2. Now rank them. For whom is each one the right choice?
3. What do you say out loud when you introduce that drill?
4. How many reps, how often, and how do they know it is working?
5. What is the failure mode — how does this drill go wrong when practised alone?

(Repeat for every fault in the taxonomy. This is the bulk of the work.)

## Session 4 — Course strategy framework

1. Standing on a tee you have never seen: what do you look at, in what order?
2. How does your advice change if the player misses right versus left?
3. When do you tell someone to take the safe play, and how do you decide?
4. What do amateurs do on the course that costs them the most strokes?
5. What looks like an available shot to an amateur but is not?

## Session 5 — Short game and putting

Repeat Sessions 1 and 3 for chipping, pitching, bunker, and putting.

## Session 6 — Golden set labelling

Sit with 40–60 swing videos spanning levels, ages, and both handedness.
For each: name the primary fault, name any secondary faults, rate your
confidence 1–5, and say what you would prescribe first.

This becomes the evaluation set. Without it there is no way to tell whether
a change to the diagnosis engine helped or hurt.
```

- [ ] **Step 2: Write the capture checklist**

Create `docs/method-extraction/capture-checklist.md`:

```markdown
# Extraction Capture Checklist

- Record audio and video of every session. Two devices; one fails eventually.
- Transcribe verbatim, including hesitation and self-correction — the moments he
  changes his mind are where the priors live.
- Never paraphrase his vocabulary into textbook terms. His words become the
  fault taxonomy the product speaks in.
- Golden set: 40–60 swings minimum. Must include left-handed players, women,
  seniors, and at least five absolute beginners, or the evaluation set will
  encode the same bias as the rest of the industry.
- After each session, list every question that produced a vague answer. Those go
  in the next session.
- Nothing from these transcripts ships to a user without his review.
```

- [ ] **Step 3: Commit**

```bash
git add docs/method-extraction/
git commit -m "docs: method extraction interview protocol and capture checklist"
```

---

### Task 2: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `src/lib/db.ts`
- Create: `prisma/schema.prisma`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `prisma` — the shared `PrismaClient` singleton exported from `src/lib/db.ts`. Every later task imports it as `import { prisma } from '@/lib/db'`.

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/lgm/golf
pnpm init
pnpm add next@15 react react-dom @prisma/client zod
pnpm add -D typescript @types/node @types/react prisma vitest tsx
```

- [ ] **Step 2: Write config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests", "prisma"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

`.env.example`:

```
DATABASE_URL="postgresql://localhost:5432/golf_dev"
```

`.gitignore`:

```
node_modules/
.next/
.env
```

Add to `package.json` scripts:

```json
"scripts": {
  "test": "vitest run",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Write the failing test**

`tests/lib/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma client', () => {
  it('connects and answers a trivial query', async () => {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    expect(rows).toEqual([{ ok: 1 }])
  })
})
```

- [ ] **Step 4: Run it and watch it fail**

Run: `pnpm test tests/lib/db.test.ts`
Expected: FAIL — cannot resolve `@/lib/db`.

- [ ] **Step 5: Write the client singleton and minimal schema**

`src/lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  dateOfBirth DateTime?
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 6: Run it and watch it pass**

```bash
cp .env.example .env
pnpm prisma generate && pnpm db:push
pnpm test tests/lib/db.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts .env.example .gitignore src/lib/db.ts prisma/schema.prisma tests/lib/db.test.ts
git commit -m "feat: project scaffold with Prisma and Vitest"
```

---

### Task 3: Player Model schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/player/types.ts`
- Create: `src/domain/player/profile.ts`
- Test: `tests/domain/player/profile.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`.
- Produces:
  - `createPlayerProfile(input: CreatePlayerProfileInput): Promise<PlayerProfile>`
  - `getPlayerProfile(userId: string): Promise<PlayerProfile | null>`
  - `CreatePlayerProfileInput` — `{ userId: string; handedness: Handedness; ageBand: AgeBand; practiceAccess: PracticeAccess; primaryGoal: PrimaryGoal; language: string }`
  - Enums `Handedness`, `AgeBand`, `PracticeAccess`, `PrimaryGoal`, `LearningStyle`, `SkillDomain`

- [ ] **Step 1: Write the failing test**

`tests/domain/player/profile.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createPlayerProfile, getPlayerProfile } from '@/domain/player/profile'

async function makeUser() {
  return prisma.user.create({
    data: { email: `p${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

describe('player profile', () => {
  beforeEach(async () => {
    await prisma.playerProfile.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates a profile and reads it back', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'LEFT',
      ageBand: 'SENIOR_55_69',
      practiceAccess: 'HOME_NET',
      primaryGoal: 'BREAK_90',
      language: 'en',
    })

    const profile = await getPlayerProfile(user.id)
    expect(profile?.handedness).toBe('LEFT')
    expect(profile?.practiceAccess).toBe('HOME_NET')
  })

  it('starts every skill domain unassessed', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'RIGHT',
      ageBand: 'ADULT_30_54',
      practiceAccess: 'FULL_FACILITY',
      primaryGoal: 'BREAK_80',
      language: 'en',
    })

    const profile = await getPlayerProfile(user.id)
    expect(profile?.fullSwingLevel).toBeNull()
    expect(profile?.shortGameLevel).toBeNull()
    expect(profile?.puttingLevel).toBeNull()
  })

  it('rejects a second profile for the same user', async () => {
    const user = await makeUser()
    const input = {
      userId: user.id,
      handedness: 'RIGHT' as const,
      ageBand: 'ADULT_30_54' as const,
      practiceAccess: 'RANGE' as const,
      primaryGoal: 'ENJOYMENT' as const,
      language: 'en',
    }
    await createPlayerProfile(input)
    await expect(createPlayerProfile(input)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/player/profile.test.ts`
Expected: FAIL — cannot resolve `@/domain/player/profile`.

- [ ] **Step 3: Extend the schema**

Append to `prisma/schema.prisma`:

```prisma
enum Handedness { LEFT RIGHT }

enum AgeBand { JUNIOR_7_12 JUNIOR_13_18 ADULT_19_29 ADULT_30_54 SENIOR_55_69 SENIOR_70_PLUS }

enum PracticeAccess { NONE HOME_NET RANGE FULL_FACILITY SIMULATOR }

enum PrimaryGoal { FIRST_ROUND BREAK_100 BREAK_90 BREAK_80 CLUB_COMPETITION COLLEGE_RECRUITING PROFESSIONAL ENJOYMENT }

enum LearningStyle { FEEL MECHANICS VISUAL DATA UNKNOWN }

enum SkillDomain { FULL_SWING SHORT_GAME PUTTING }

model PlayerProfile {
  id             String         @id @default(cuid())
  userId         String         @unique
  user           User           @relation(fields: [userId], references: [id])

  handedness     Handedness
  ageBand        AgeBand
  practiceAccess PracticeAccess
  primaryGoal    PrimaryGoal
  learningStyle  LearningStyle  @default(UNKNOWN)
  language       String         @default("en")

  // Per-domain assessment. Null until the Video Combine has been completed.
  // Levels are 0-54 handicap-equivalent bands; confidence is 0..1.
  fullSwingLevel      Int?
  fullSwingConfidence Float?
  shortGameLevel      Int?
  shortGameConfidence Float?
  puttingLevel        Int?
  puttingConfidence   Float?

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

Add the back-relation to `User`:

```prisma
  profile     PlayerProfile?
```

- [ ] **Step 4: Write the domain module**

`src/domain/player/types.ts`:

```ts
export type {
  Handedness,
  AgeBand,
  PracticeAccess,
  PrimaryGoal,
  LearningStyle,
  SkillDomain,
  PlayerProfile,
} from '@prisma/client'

export interface CreatePlayerProfileInput {
  userId: string
  handedness: import('@prisma/client').Handedness
  ageBand: import('@prisma/client').AgeBand
  practiceAccess: import('@prisma/client').PracticeAccess
  primaryGoal: import('@prisma/client').PrimaryGoal
  language: string
}
```

`src/domain/player/profile.ts`:

```ts
import { prisma } from '@/lib/db'
import type { CreatePlayerProfileInput, PlayerProfile } from './types'

export async function createPlayerProfile(
  input: CreatePlayerProfileInput,
): Promise<PlayerProfile> {
  return prisma.playerProfile.create({ data: input })
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  return prisma.playerProfile.findUnique({ where: { userId } })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/player/profile.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/player tests/domain/player
git commit -m "feat: player profile schema with per-domain skill levels"
```

---

### Task 4: Versioned consent documents

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/consent/documents.ts`
- Create: `prisma/seed.ts`
- Test: `tests/domain/consent/documents.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`.
- Produces:
  - `getCurrentDocument(kind: ConsentKind): Promise<ConsentDocument>` — throws if none.
  - `listRequiredDocuments(opts: { isMinor: boolean }): Promise<ConsentDocument[]>`
  - Enum `ConsentKind` with members `WAIVER`, `HEALTH_ATTESTATION`, `MINOR_PARENTAL`, `ON_COURSE_DISCLAIMER`, `SECONDARY_USE`

- [ ] **Step 1: Write the failing test**

`tests/domain/consent/documents.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getCurrentDocument, listRequiredDocuments } from '@/domain/consent/documents'

async function seedDoc(kind: any, version: number, required: boolean) {
  return prisma.consentDocument.create({
    data: { kind, version, required, body: `DRAFT — PENDING ATTORNEY REVIEW\n${kind} v${version}` },
  })
}

describe('consent documents', () => {
  beforeEach(async () => {
    await prisma.consentDocument.deleteMany()
  })

  it('returns the highest version for a kind', async () => {
    await seedDoc('WAIVER', 1, true)
    await seedDoc('WAIVER', 2, true)
    const doc = await getCurrentDocument('WAIVER')
    expect(doc.version).toBe(2)
  })

  it('throws when a kind has no document', async () => {
    await expect(getCurrentDocument('WAIVER')).rejects.toThrow(/no consent document/i)
  })

  it('excludes parental consent for adults and includes it for minors', async () => {
    await seedDoc('WAIVER', 1, true)
    await seedDoc('MINOR_PARENTAL', 1, true)
    await seedDoc('SECONDARY_USE', 1, false)

    const adult = await listRequiredDocuments({ isMinor: false })
    expect(adult.map((d) => d.kind)).toEqual(['WAIVER'])

    const minor = await listRequiredDocuments({ isMinor: true })
    expect(minor.map((d) => d.kind).sort()).toEqual(['MINOR_PARENTAL', 'WAIVER'])
  })

  it('never lists secondary use as required', async () => {
    await seedDoc('SECONDARY_USE', 1, false)
    const docs = await listRequiredDocuments({ isMinor: false })
    expect(docs).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/consent/documents.test.ts`
Expected: FAIL — cannot resolve `@/domain/consent/documents`.

- [ ] **Step 3: Extend the schema**

```prisma
enum ConsentKind {
  WAIVER
  HEALTH_ATTESTATION
  MINOR_PARENTAL
  ON_COURSE_DISCLAIMER
  SECONDARY_USE
}

model ConsentDocument {
  id            String      @id @default(cuid())
  kind          ConsentKind
  version       Int
  body          String
  required      Boolean
  effectiveFrom DateTime    @default(now())
  acceptances   ConsentAcceptance[]

  @@unique([kind, version])
}
```

- [ ] **Step 4: Write the module**

`src/domain/consent/documents.ts`:

```ts
import { prisma } from '@/lib/db'
import type { ConsentDocument, ConsentKind } from '@prisma/client'

export async function getCurrentDocument(kind: ConsentKind): Promise<ConsentDocument> {
  const doc = await prisma.consentDocument.findFirst({
    where: { kind },
    orderBy: { version: 'desc' },
  })
  if (!doc) throw new Error(`No consent document exists for kind ${kind}`)
  return doc
}

export async function listRequiredDocuments(opts: {
  isMinor: boolean
}): Promise<ConsentDocument[]> {
  const docs = await prisma.consentDocument.findMany({
    where: { required: true },
    orderBy: [{ kind: 'asc' }, { version: 'desc' }],
    distinct: ['kind'],
  })
  return opts.isMinor ? docs : docs.filter((d) => d.kind !== 'MINOR_PARENTAL')
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/consent/documents.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Write the seed**

`prisma/seed.ts`. Every body carries the DRAFT banner required by Global Constraints.

```ts
import { prisma } from '../src/lib/db'

const DRAFT = 'DRAFT — PENDING ATTORNEY REVIEW'

const documents = [
  {
    kind: 'WAIVER' as const,
    required: true,
    body: `${DRAFT}\n\nAssumption of Risk and Release of Liability.\n\nGolf involves swinging a club at speed and the risk of injury is foreseeable. By accepting, you acknowledge that you participate at your own risk and release the operator from liability for ordinary negligence to the maximum extent permitted by law in your jurisdiction.`,
  },
  {
    kind: 'HEALTH_ATTESTATION' as const,
    required: true,
    body: `${DRAFT}\n\nHealth Attestation.\n\nYou confirm that you are in adequate physical condition to undertake golf activity, and that you have disclosed any condition that would make physical activity unsafe. This product does not diagnose medical conditions and does not prescribe rehabilitation. If any screening question is answered yes, consult a physician before proceeding.`,
  },
  {
    kind: 'MINOR_PARENTAL' as const,
    required: true,
    body: `${DRAFT}\n\nParental Consent.\n\nA parent or legal guardian must consent to the participation of a user under 18, and must accept the assumption of risk on the minor's behalf. Users under 13 are additionally subject to verifiable parental consent requirements under COPPA.`,
  },
  {
    kind: 'ON_COURSE_DISCLAIMER' as const,
    required: true,
    body: `${DRAFT}\n\nOn-Course Advice.\n\nStrategy recommendations are advisory only. Course conditions, weather, and lie vary and may not be reflected in our data. You remain solely responsible for shot selection and for your own safety and that of others.`,
  },
  {
    kind: 'SECONDARY_USE' as const,
    required: false,
    body: `${DRAFT}\n\nOptional: Use of Your Data for Aggregate Research.\n\nYou may allow your de-identified swing and round data to be used to improve coaching for all users. This is entirely optional. Declining does not limit your use of the product in any way, and you may withdraw at any time.`,
  },
]

async function main() {
  for (const doc of documents) {
    await prisma.consentDocument.upsert({
      where: { kind_version: { kind: doc.kind, version: 1 } },
      update: {},
      create: { ...doc, version: 1 },
    })
  }
}

main().then(() => prisma.$disconnect())
```

- [ ] **Step 7: Run the seed and verify**

```bash
pnpm db:seed
pnpm prisma studio --browser none &
```

Or verify directly:

```bash
pnpm tsx -e "import {prisma} from './src/lib/db'; prisma.consentDocument.count().then(n => {console.log(n); return prisma.\$disconnect()})"
```

Expected output: `5`

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/domain/consent tests/domain/consent
git commit -m "feat: versioned consent documents with draft legal copy"
```

---

### Task 5: Append-only consent acceptance

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/consent/acceptance.ts`
- Test: `tests/domain/consent/acceptance.test.ts`

**Interfaces:**
- Consumes: `getCurrentDocument` from `@/domain/consent/documents`.
- Produces:
  - `recordAcceptance(input: RecordAcceptanceInput): Promise<ConsentAcceptance>`
  - `RecordAcceptanceInput` — `{ userId: string; kind: ConsentKind; ipAddress?: string; userAgent?: string; acceptedByUserId?: string }`
  - `listAcceptances(userId: string): Promise<ConsentAcceptance[]>`

The audit trail is the point: the record captures **which version** was accepted, by whom, when, and from where.

- [ ] **Step 1: Write the failing test**

`tests/domain/consent/acceptance.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { recordAcceptance, listAcceptances } from '@/domain/consent/acceptance'

async function makeUser() {
  return prisma.user.create({
    data: { email: `a${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

describe('consent acceptance', () => {
  beforeEach(async () => {
    await prisma.consentAcceptance.deleteMany()
    await prisma.consentDocument.deleteMany()
    await prisma.user.deleteMany()
    await prisma.consentDocument.create({
      data: { kind: 'WAIVER', version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
  })

  it('pins the accepted document version', async () => {
    const user = await makeUser()
    const acceptance = await recordAcceptance({
      userId: user.id,
      kind: 'WAIVER',
      ipAddress: '203.0.113.7',
      userAgent: 'test-agent',
    })

    const doc = await prisma.consentDocument.findUnique({ where: { id: acceptance.documentId } })
    expect(doc?.version).toBe(1)
    expect(acceptance.ipAddress).toBe('203.0.113.7')
  })

  it('records a new row when a newer version is accepted, keeping the old one', async () => {
    const user = await makeUser()
    await recordAcceptance({ userId: user.id, kind: 'WAIVER' })

    await prisma.consentDocument.create({
      data: { kind: 'WAIVER', version: 2, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW v2' },
    })
    await recordAcceptance({ userId: user.id, kind: 'WAIVER' })

    const all = await listAcceptances(user.id)
    expect(all).toHaveLength(2)
  })

  it('is idempotent for the same user and version', async () => {
    const user = await makeUser()
    await recordAcceptance({ userId: user.id, kind: 'WAIVER' })
    await recordAcceptance({ userId: user.id, kind: 'WAIVER' })
    expect(await listAcceptances(user.id)).toHaveLength(1)
  })

  it('stores the accepting adult for parental consent', async () => {
    const parent = await makeUser()
    const child = await makeUser()
    await prisma.consentDocument.create({
      data: { kind: 'MINOR_PARENTAL', version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })

    const acceptance = await recordAcceptance({
      userId: child.id,
      kind: 'MINOR_PARENTAL',
      acceptedByUserId: parent.id,
    })
    expect(acceptance.acceptedByUserId).toBe(parent.id)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/consent/acceptance.test.ts`
Expected: FAIL — cannot resolve `@/domain/consent/acceptance`.

- [ ] **Step 3: Extend the schema**

Note there is no `updatedAt` — this table is append-only by design.

```prisma
model ConsentAcceptance {
  id               String          @id @default(cuid())
  userId           String
  user             User            @relation("UserAcceptances", fields: [userId], references: [id])
  documentId       String
  document         ConsentDocument @relation(fields: [documentId], references: [id])
  acceptedAt       DateTime        @default(now())
  ipAddress        String?
  userAgent        String?
  acceptedByUserId String?

  @@unique([userId, documentId])
}
```

Add the back-relation to `User`:

```prisma
  acceptances ConsentAcceptance[] @relation("UserAcceptances")
```

- [ ] **Step 4: Write the module**

`src/domain/consent/acceptance.ts`:

```ts
import { prisma } from '@/lib/db'
import type { ConsentAcceptance, ConsentKind } from '@prisma/client'
import { getCurrentDocument } from './documents'

export interface RecordAcceptanceInput {
  userId: string
  kind: ConsentKind
  ipAddress?: string
  userAgent?: string
  acceptedByUserId?: string
}

export async function recordAcceptance(
  input: RecordAcceptanceInput,
): Promise<ConsentAcceptance> {
  const doc = await getCurrentDocument(input.kind)

  const existing = await prisma.consentAcceptance.findUnique({
    where: { userId_documentId: { userId: input.userId, documentId: doc.id } },
  })
  if (existing) return existing

  return prisma.consentAcceptance.create({
    data: {
      userId: input.userId,
      documentId: doc.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      acceptedByUserId: input.acceptedByUserId,
    },
  })
}

export async function listAcceptances(userId: string): Promise<ConsentAcceptance[]> {
  return prisma.consentAcceptance.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'asc' },
  })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/consent/acceptance.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/consent/acceptance.ts tests/domain/consent/acceptance.test.ts
git commit -m "feat: append-only consent acceptance with version pinning"
```

---

### Task 6: The consent gate

The single authority on whether a user may proceed. Everything downstream calls this.

**Files:**
- Create: `src/domain/consent/gate.ts`
- Test: `tests/domain/consent/gate.test.ts`

**Interfaces:**
- Consumes: `listRequiredDocuments` from `./documents`, `prisma` from `@/lib/db`.
- Produces:
  - `missingRequiredConsents(userId: string): Promise<ConsentKind[]>` — empty array means the user may proceed.
  - `isMinor(dateOfBirth: Date | null, now?: Date): boolean`
  - `hasSecondaryUseConsent(userId: string): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

`tests/domain/consent/gate.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { missingRequiredConsents, isMinor, hasSecondaryUseConsent } from '@/domain/consent/gate'
import { recordAcceptance } from '@/domain/consent/acceptance'

const KINDS = ['WAIVER', 'HEALTH_ATTESTATION', 'ON_COURSE_DISCLAIMER'] as const

describe('consent gate', () => {
  beforeEach(async () => {
    await prisma.consentAcceptance.deleteMany()
    await prisma.consentDocument.deleteMany()
    await prisma.user.deleteMany()
    for (const kind of KINDS) {
      await prisma.consentDocument.create({
        data: { kind, version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
      })
    }
    await prisma.consentDocument.create({
      data: { kind: 'MINOR_PARENTAL', version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
    await prisma.consentDocument.create({
      data: { kind: 'SECONDARY_USE', version: 1, required: false, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
  })

  it('classifies minors by date of birth', () => {
    const now = new Date('2026-08-22')
    expect(isMinor(new Date('2010-01-01'), now)).toBe(true)
    expect(isMinor(new Date('2000-01-01'), now)).toBe(false)
    expect(isMinor(null, now)).toBe(false)
  })

  it('blocks a brand-new adult on all three required consents', async () => {
    const user = await prisma.user.create({
      data: { email: 'g1@example.com', dateOfBirth: new Date('1980-05-01') },
    })
    const missing = await missingRequiredConsents(user.id)
    expect(missing.sort()).toEqual(['HEALTH_ATTESTATION', 'ON_COURSE_DISCLAIMER', 'WAIVER'])
  })

  it('clears once every required consent is accepted', async () => {
    const user = await prisma.user.create({
      data: { email: 'g2@example.com', dateOfBirth: new Date('1980-05-01') },
    })
    for (const kind of KINDS) await recordAcceptance({ userId: user.id, kind })
    expect(await missingRequiredConsents(user.id)).toEqual([])
  })

  it('additionally requires parental consent for a minor', async () => {
    const user = await prisma.user.create({
      data: { email: 'g3@example.com', dateOfBirth: new Date('2012-05-01') },
    })
    for (const kind of KINDS) await recordAcceptance({ userId: user.id, kind })
    expect(await missingRequiredConsents(user.id)).toEqual(['MINOR_PARENTAL'])
  })

  it('does not block a user who declined secondary use', async () => {
    const user = await prisma.user.create({
      data: { email: 'g4@example.com', dateOfBirth: new Date('1980-05-01') },
    })
    for (const kind of KINDS) await recordAcceptance({ userId: user.id, kind })

    expect(await missingRequiredConsents(user.id)).toEqual([])
    expect(await hasSecondaryUseConsent(user.id)).toBe(false)
  })

  it('reports secondary use consent when granted', async () => {
    const user = await prisma.user.create({
      data: { email: 'g5@example.com', dateOfBirth: new Date('1980-05-01') },
    })
    await recordAcceptance({ userId: user.id, kind: 'SECONDARY_USE' })
    expect(await hasSecondaryUseConsent(user.id)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/consent/gate.test.ts`
Expected: FAIL — cannot resolve `@/domain/consent/gate`.

- [ ] **Step 3: Write the module**

`src/domain/consent/gate.ts`:

```ts
import { prisma } from '@/lib/db'
import type { ConsentKind } from '@prisma/client'
import { listRequiredDocuments } from './documents'

export function isMinor(dateOfBirth: Date | null, now: Date = new Date()): boolean {
  if (!dateOfBirth) return false
  const eighteenth = new Date(dateOfBirth)
  eighteenth.setFullYear(eighteenth.getFullYear() + 18)
  return now < eighteenth
}

export async function missingRequiredConsents(userId: string): Promise<ConsentKind[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const required = await listRequiredDocuments({ isMinor: isMinor(user.dateOfBirth) })

  const accepted = await prisma.consentAcceptance.findMany({
    where: { userId, documentId: { in: required.map((d) => d.id) } },
    select: { documentId: true },
  })
  const acceptedIds = new Set(accepted.map((a) => a.documentId))

  return required.filter((d) => !acceptedIds.has(d.id)).map((d) => d.kind)
}

export async function hasSecondaryUseConsent(userId: string): Promise<boolean> {
  const count = await prisma.consentAcceptance.count({
    where: { userId, document: { kind: 'SECONDARY_USE' } },
  })
  return count > 0
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/consent/gate.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/consent/gate.ts tests/domain/consent/gate.test.ts
git commit -m "feat: consent gate as single authority on user access"
```

---

### Task 7: PAR-Q health attestation

Screens and refers. Never diagnoses, never prescribes.

**Files:**
- Create: `src/domain/consent/health.ts`
- Test: `tests/domain/consent/health.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `PARQ_QUESTIONS: readonly { id: string; text: string }[]` — seven questions.
  - `evaluateHealthScreen(answers: Record<string, boolean>): HealthScreenResult`
  - `HealthScreenResult` — `{ clearedToProceed: boolean; flaggedQuestionIds: string[]; referralMessage: string | null }`

- [ ] **Step 1: Write the failing test**

`tests/domain/consent/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PARQ_QUESTIONS, evaluateHealthScreen } from '@/domain/consent/health'

function allNo(): Record<string, boolean> {
  return Object.fromEntries(PARQ_QUESTIONS.map((q) => [q.id, false]))
}

describe('health screen', () => {
  it('asks seven questions', () => {
    expect(PARQ_QUESTIONS).toHaveLength(7)
  })

  it('clears a golfer who answers no to everything', () => {
    const result = evaluateHealthScreen(allNo())
    expect(result.clearedToProceed).toBe(true)
    expect(result.flaggedQuestionIds).toEqual([])
    expect(result.referralMessage).toBeNull()
  })

  it('refers a golfer who answers yes to any question', () => {
    const answers = { ...allNo(), heart_condition: true }
    const result = evaluateHealthScreen(answers)
    expect(result.clearedToProceed).toBe(false)
    expect(result.flaggedQuestionIds).toEqual(['heart_condition'])
    expect(result.referralMessage).toMatch(/physician/i)
  })

  it('never returns a diagnosis or a prescription', () => {
    const result = evaluateHealthScreen({ ...allNo(), joint_problem: true })
    expect(result.referralMessage).not.toMatch(/you have|diagnos|treat|exercise plan/i)
  })

  it('rejects an incomplete screen', () => {
    expect(() => evaluateHealthScreen({ heart_condition: false })).toThrow(/unanswered/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/consent/health.test.ts`
Expected: FAIL — cannot resolve `@/domain/consent/health`.

- [ ] **Step 3: Write the module**

`src/domain/consent/health.ts`:

```ts
export const PARQ_QUESTIONS = [
  { id: 'heart_condition', text: 'Has a doctor ever said you have a heart condition, or that you should only do physical activity recommended by a doctor?' },
  { id: 'chest_pain_activity', text: 'Do you feel pain in your chest when you do physical activity?' },
  { id: 'chest_pain_rest', text: 'In the past month, have you had chest pain when you were not doing physical activity?' },
  { id: 'balance_loss', text: 'Do you lose your balance because of dizziness, or do you ever lose consciousness?' },
  { id: 'joint_problem', text: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?' },
  { id: 'medication', text: 'Is a doctor currently prescribing drugs for your blood pressure or a heart condition?' },
  { id: 'other_reason', text: 'Do you know of any other reason why you should not do physical activity?' },
] as const

export interface HealthScreenResult {
  clearedToProceed: boolean
  flaggedQuestionIds: string[]
  referralMessage: string | null
}

const REFERRAL =
  'Please speak with your physician before beginning golf activity. We are not able to advise on medical matters, and this product does not diagnose conditions or prescribe treatment.'

export function evaluateHealthScreen(answers: Record<string, boolean>): HealthScreenResult {
  const unanswered = PARQ_QUESTIONS.filter((q) => typeof answers[q.id] !== 'boolean')
  if (unanswered.length > 0) {
    throw new Error(`Health screen has unanswered questions: ${unanswered.map((q) => q.id).join(', ')}`)
  }

  const flaggedQuestionIds = PARQ_QUESTIONS.filter((q) => answers[q.id]).map((q) => q.id)

  return {
    clearedToProceed: flaggedQuestionIds.length === 0,
    flaggedQuestionIds,
    referralMessage: flaggedQuestionIds.length === 0 ? null : REFERRAL,
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/consent/health.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/consent/health.ts tests/domain/consent/health.test.ts
git commit -m "feat: PAR-Q health screen with refer-not-prescribe posture"
```

---

### Task 8: Consent HTTP surface

**Files:**
- Create: `src/app/api/consent/route.ts`
- Test: `tests/app/api/consent.test.ts`

**Interfaces:**
- Consumes: `missingRequiredConsents` from `@/domain/consent/gate`, `recordAcceptance` from `@/domain/consent/acceptance`, `listRequiredDocuments` from `@/domain/consent/documents`.
- Produces: `GET /api/consent?userId=` → `{ missing: ConsentKind[]; documents: {kind,version,body}[] }`; `POST /api/consent` → `{ missing: ConsentKind[] }`.

- [ ] **Step 1: Write the failing test**

`tests/app/api/consent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { GET, POST } from '@/app/api/consent/route'

beforeEach(async () => {
  await prisma.consentAcceptance.deleteMany()
  await prisma.consentDocument.deleteMany()
  await prisma.user.deleteMany()
  await prisma.consentDocument.create({
    data: { kind: 'WAIVER', version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
  })
})

describe('GET /api/consent', () => {
  it('lists what is still missing', async () => {
    const user = await prisma.user.create({ data: { email: 'h1@example.com' } })
    const res = await GET(new Request(`http://t/api/consent?userId=${user.id}`))
    const body = await res.json()
    expect(body.missing).toEqual(['WAIVER'])
    expect(body.documents[0].body).toContain('DRAFT — PENDING ATTORNEY REVIEW')
  })

  it('rejects a request with no userId', async () => {
    const res = await GET(new Request('http://t/api/consent'))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/consent', () => {
  it('records an acceptance and returns the updated gap', async () => {
    const user = await prisma.user.create({ data: { email: 'h2@example.com' } })
    const res = await POST(
      new Request('http://t/api/consent', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, kind: 'WAIVER' }),
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).missing).toEqual([])
  })

  it('rejects an unknown consent kind', async () => {
    const user = await prisma.user.create({ data: { email: 'h3@example.com' } })
    const res = await POST(
      new Request('http://t/api/consent', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, kind: 'NOT_A_KIND' }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/app/api/consent.test.ts`
Expected: FAIL — cannot resolve `@/app/api/consent/route`.

- [ ] **Step 3: Write the route**

`src/app/api/consent/route.ts`:

```ts
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { missingRequiredConsents, isMinor } from '@/domain/consent/gate'
import { recordAcceptance } from '@/domain/consent/acceptance'
import { listRequiredDocuments } from '@/domain/consent/documents'

const KINDS = ['WAIVER', 'HEALTH_ATTESTATION', 'MINOR_PARENTAL', 'ON_COURSE_DISCLAIMER', 'SECONDARY_USE'] as const

const postSchema = z.object({
  userId: z.string().min(1),
  kind: z.enum(KINDS),
  acceptedByUserId: z.string().optional(),
})

export async function GET(request: Request): Promise<Response> {
  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return Response.json({ error: 'user not found' }, { status: 404 })

  const [missing, documents] = await Promise.all([
    missingRequiredConsents(userId),
    listRequiredDocuments({ isMinor: isMinor(user.dateOfBirth) }),
  ])

  return Response.json({
    missing,
    documents: documents.map((d) => ({ kind: d.kind, version: d.version, body: d.body })),
  })
}

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const { userId, kind, acceptedByUserId } = parsed.data
  await recordAcceptance({
    userId,
    kind,
    acceptedByUserId,
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  return Response.json({ missing: await missingRequiredConsents(userId) })
}
```

- [ ] **Step 4: Run the whole suite**

Run: `pnpm test`
Expected: PASS, all tests across all files.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/consent tests/app/api
git commit -m "feat: consent API surface"
```

---

## Done when

- `pnpm test` passes.
- A new user cannot reach any product surface until `missingRequiredConsents` returns `[]`.
- Declining secondary use blocks nothing.
- Every seeded legal document still carries `DRAFT — PENDING ATTORNEY REVIEW`.
- The interview protocol is in the pro's hands.
