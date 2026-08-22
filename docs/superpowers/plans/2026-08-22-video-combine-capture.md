# Video Combine Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a golfer complete the standardised Video Combine — the assessment protocol that populates the Player Model — with guided capture, three-swing enforcement, and durable upload.

**Architecture:** The protocol is data, not code: a declarative list of required shots, each with a club, a camera angle, and a swing count. A `CaptureSession` accumulates `SwingClip` rows against that protocol; a pure `evaluateSessionCompleteness` function reports what is still missing. Object storage is behind a `StoragePort` interface so tests never touch a network.

**Tech Stack:** Next.js 15, TypeScript 5, Prisma 6, PostgreSQL 16, Vitest, Zod, S3-compatible object storage.

## Global Constraints

- Requires the Foundation plan (`2026-08-22-foundation-and-extraction-kit.md`) to be complete. This plan consumes `prisma`, `missingRequiredConsents`, and `PlayerProfile`.
- Package manager is **pnpm**.
- **No capture endpoint may be reached by a user with outstanding required consents.** Every route in this plan calls `missingRequiredConsents` first and returns 403 when it is non-empty.
- **Three swings per shot, unedited.** The variance across three is more diagnostic than the quality of the best one, so the protocol must never accept a single clip in place of three.
- Handedness is carried on the clip, not inferred. Left-handed golfers are first-class — capture guidance mirrors, and no code path assumes right-handed.
- Storage access is always through `StoragePort`. No direct SDK calls in domain code.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/domain/combine/protocol.ts` | The declarative Video Combine protocol. Pure data. |
| `src/domain/combine/session.ts` | Create sessions, attach clips, read state. |
| `src/domain/combine/completeness.ts` | Pure function: what is still missing. |
| `src/domain/storage/port.ts` | `StoragePort` interface. |
| `src/domain/storage/s3.ts` | S3-compatible implementation. |
| `src/domain/storage/memory.ts` | In-memory implementation for tests. |
| `src/app/api/combine/session/route.ts` | Start a session, read its state. |
| `src/app/api/combine/clip/route.ts` | Issue an upload URL, register a clip. |

---

### Task 1: The Combine protocol

**Files:**
- Create: `src/domain/combine/protocol.ts`
- Test: `tests/domain/combine/protocol.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `COMBINE_PROTOCOL: readonly ShotRequirement[]`
  - `ShotRequirement` — `{ id: string; domain: SkillDomain; club: ClubKind; angle: CameraAngle; swings: number; guidance: string }`
  - `ClubKind` = `'DRIVER' | 'MID_IRON' | 'WEDGE' | 'PUTTER'`
  - `CameraAngle` = `'FACE_ON' | 'DOWN_THE_LINE'`
  - `getRequirement(id: string): ShotRequirement | undefined`

- [ ] **Step 1: Write the failing test**

`tests/domain/combine/protocol.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COMBINE_PROTOCOL, getRequirement } from '@/domain/combine/protocol'

describe('combine protocol', () => {
  it('requires exactly three swings for every shot', () => {
    for (const req of COMBINE_PROTOCOL) {
      expect(req.swings, `${req.id} must require 3 swings`).toBe(3)
    }
  })

  it('covers all three skill domains', () => {
    const domains = new Set(COMBINE_PROTOCOL.map((r) => r.domain))
    expect([...domains].sort()).toEqual(['FULL_SWING', 'PUTTING', 'SHORT_GAME'])
  })

  it('captures driver and mid-iron from both angles', () => {
    for (const club of ['DRIVER', 'MID_IRON'] as const) {
      const angles = COMBINE_PROTOCOL.filter((r) => r.club === club).map((r) => r.angle).sort()
      expect(angles).toEqual(['DOWN_THE_LINE', 'FACE_ON'])
    }
  })

  it('uses unique ids', () => {
    const ids = COMBINE_PROTOCOL.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives non-empty guidance for every shot', () => {
    for (const req of COMBINE_PROTOCOL) {
      expect(req.guidance.length).toBeGreaterThan(10)
    }
  })

  it('looks a requirement up by id', () => {
    expect(getRequirement('driver_face_on')?.club).toBe('DRIVER')
    expect(getRequirement('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/combine/protocol.test.ts`
Expected: FAIL — cannot resolve `@/domain/combine/protocol`.

- [ ] **Step 3: Write the protocol**

`src/domain/combine/protocol.ts`:

```ts
import type { SkillDomain } from '@prisma/client'

export type ClubKind = 'DRIVER' | 'MID_IRON' | 'WEDGE' | 'PUTTER'
export type CameraAngle = 'FACE_ON' | 'DOWN_THE_LINE'

export interface ShotRequirement {
  id: string
  domain: SkillDomain
  club: ClubKind
  angle: CameraAngle
  swings: number
  guidance: string
}

const SWINGS_PER_SHOT = 3

export const COMBINE_PROTOCOL: readonly ShotRequirement[] = [
  {
    id: 'driver_face_on',
    domain: 'FULL_SWING',
    club: 'DRIVER',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'Camera at hip height, facing you square on, about ten feet away. Whole body and club in frame at the top.',
  },
  {
    id: 'driver_down_the_line',
    domain: 'FULL_SWING',
    club: 'DRIVER',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Camera behind you on the target line, hip height, about ten feet back. Hands and target both in frame.',
  },
  {
    id: 'mid_iron_face_on',
    domain: 'FULL_SWING',
    club: 'MID_IRON',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same position as the driver face-on. Use a seven iron if you have one.',
  },
  {
    id: 'mid_iron_down_the_line',
    domain: 'FULL_SWING',
    club: 'MID_IRON',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same position as the driver down-the-line. Use a seven iron if you have one.',
  },
  {
    id: 'pitch_face_on',
    domain: 'SHORT_GAME',
    club: 'WEDGE',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A pitch of roughly forty yards. Camera square on at hip height.',
  },
  {
    id: 'chip_face_on',
    domain: 'SHORT_GAME',
    club: 'WEDGE',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A short chip from just off the green. Camera square on, low, close enough to see the strike.',
  },
  {
    id: 'putt_face_on',
    domain: 'PUTTING',
    club: 'PUTTER',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A ten foot putt. Camera square on at waist height, close enough to see the stroke.',
  },
  {
    id: 'putt_down_the_line',
    domain: 'PUTTING',
    club: 'PUTTER',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same putt from directly behind the ball, low, on the target line.',
  },
]

export function getRequirement(id: string): ShotRequirement | undefined {
  return COMBINE_PROTOCOL.find((r) => r.id === id)
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/combine/protocol.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/combine/protocol.ts tests/domain/combine/protocol.test.ts
git commit -m "feat: declarative Video Combine protocol"
```

---

### Task 2: Storage port

**Files:**
- Create: `src/domain/storage/port.ts`
- Create: `src/domain/storage/memory.ts`
- Create: `src/domain/storage/s3.ts`
- Test: `tests/domain/storage/memory.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `StoragePort` — `{ createUploadUrl(key: string, contentType: string): Promise<UploadTarget>; exists(key: string): Promise<boolean> }`
  - `UploadTarget` — `{ url: string; key: string; expiresAt: Date }`
  - `InMemoryStorage` — test double implementing `StoragePort`, with `markUploaded(key: string): void`
  - `S3Storage` — production implementation.

- [ ] **Step 1: Write the failing test**

`tests/domain/storage/memory.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { InMemoryStorage } from '@/domain/storage/memory'

describe('in-memory storage', () => {
  it('issues an upload target for a key', async () => {
    const storage = new InMemoryStorage()
    const target = await storage.createUploadUrl('clips/a.mp4', 'video/mp4')
    expect(target.key).toBe('clips/a.mp4')
    expect(target.url).toContain('clips/a.mp4')
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('reports a key as absent until it is uploaded', async () => {
    const storage = new InMemoryStorage()
    await storage.createUploadUrl('clips/b.mp4', 'video/mp4')
    expect(await storage.exists('clips/b.mp4')).toBe(false)
    storage.markUploaded('clips/b.mp4')
    expect(await storage.exists('clips/b.mp4')).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/storage/memory.test.ts`
Expected: FAIL — cannot resolve `@/domain/storage/memory`.

- [ ] **Step 3: Write the port and the in-memory double**

`src/domain/storage/port.ts`:

```ts
export interface UploadTarget {
  url: string
  key: string
  expiresAt: Date
}

export interface StoragePort {
  createUploadUrl(key: string, contentType: string): Promise<UploadTarget>
  exists(key: string): Promise<boolean>
}
```

`src/domain/storage/memory.ts`:

```ts
import type { StoragePort, UploadTarget } from './port'

export class InMemoryStorage implements StoragePort {
  private uploaded = new Set<string>()

  async createUploadUrl(key: string, _contentType: string): Promise<UploadTarget> {
    return {
      url: `memory://upload/${key}`,
      key,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.uploaded.has(key)
  }

  markUploaded(key: string): void {
    this.uploaded.add(key)
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/storage/memory.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the S3 implementation**

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

`src/domain/storage/s3.ts`:

```ts
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StoragePort, UploadTarget } from './port'

const EXPIRY_SECONDS = 15 * 60

export class S3Storage implements StoragePort {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async createUploadUrl(key: string, contentType: string): Promise<UploadTarget> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    const url = await getSignedUrl(this.client, command, { expiresIn: EXPIRY_SECONDS })
    return { url, key, expiresAt: new Date(Date.now() + EXPIRY_SECONDS * 1000) }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/domain/storage tests/domain/storage package.json pnpm-lock.yaml
git commit -m "feat: storage port with in-memory and S3 implementations"
```

---

### Task 3: Capture session and clips

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/combine/session.ts`
- Test: `tests/domain/combine/session.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getRequirement` from `./protocol`, `StoragePort`.
- Produces:
  - `startSession(userId: string): Promise<CaptureSession>`
  - `registerClip(input: RegisterClipInput): Promise<SwingClip>`
  - `RegisterClipInput` — `{ sessionId: string; requirementId: string; swingIndex: number; storageKey: string; handedness: Handedness; durationMs: number }`
  - `getSessionWithClips(sessionId: string): Promise<CaptureSessionWithClips | null>`

- [ ] **Step 1: Write the failing test**

`tests/domain/combine/session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { startSession, registerClip, getSessionWithClips } from '@/domain/combine/session'

async function makeUser() {
  return prisma.user.create({
    data: { email: `c${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

describe('capture session', () => {
  beforeEach(async () => {
    await prisma.swingClip.deleteMany()
    await prisma.captureSession.deleteMany()
    await prisma.user.deleteMany()
  })

  it('starts an open session', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    expect(session.status).toBe('OPEN')
    expect(session.userId).toBe(user.id)
  })

  it('registers a clip against a requirement', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    const clip = await registerClip({
      sessionId: session.id,
      requirementId: 'driver_face_on',
      swingIndex: 0,
      storageKey: 'clips/x.mp4',
      handedness: 'LEFT',
      durationMs: 4200,
    })
    expect(clip.requirementId).toBe('driver_face_on')
    expect(clip.handedness).toBe('LEFT')
  })

  it('rejects an unknown requirement id', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    await expect(
      registerClip({
        sessionId: session.id,
        requirementId: 'not_a_shot',
        swingIndex: 0,
        storageKey: 'clips/y.mp4',
        handedness: 'RIGHT',
        durationMs: 4200,
      }),
    ).rejects.toThrow(/unknown requirement/i)
  })

  it('rejects a swing index outside the required count', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    await expect(
      registerClip({
        sessionId: session.id,
        requirementId: 'driver_face_on',
        swingIndex: 3,
        storageKey: 'clips/z.mp4',
        handedness: 'RIGHT',
        durationMs: 4200,
      }),
    ).rejects.toThrow(/swing index/i)
  })

  it('replaces a re-uploaded swing rather than duplicating it', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    const base = {
      sessionId: session.id,
      requirementId: 'driver_face_on',
      swingIndex: 0,
      handedness: 'RIGHT' as const,
      durationMs: 4200,
    }
    await registerClip({ ...base, storageKey: 'clips/first.mp4' })
    await registerClip({ ...base, storageKey: 'clips/second.mp4' })

    const loaded = await getSessionWithClips(session.id)
    expect(loaded?.clips).toHaveLength(1)
    expect(loaded?.clips[0]?.storageKey).toBe('clips/second.mp4')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/combine/session.test.ts`
Expected: FAIL — cannot resolve `@/domain/combine/session`.

- [ ] **Step 3: Extend the schema**

```prisma
enum CaptureSessionStatus { OPEN COMPLETE ABANDONED }

model CaptureSession {
  id        String                @id @default(cuid())
  userId    String
  user      User                  @relation("UserSessions", fields: [userId], references: [id])
  status    CaptureSessionStatus  @default(OPEN)
  clips     SwingClip[]
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt
}

model SwingClip {
  id            String         @id @default(cuid())
  sessionId     String
  session       CaptureSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  requirementId String
  swingIndex    Int
  storageKey    String
  handedness    Handedness
  durationMs    Int
  createdAt     DateTime       @default(now())

  @@unique([sessionId, requirementId, swingIndex])
}
```

Add the back-relation to `User`:

```prisma
  captureSessions CaptureSession[] @relation("UserSessions")
```

- [ ] **Step 4: Write the module**

`src/domain/combine/session.ts`:

```ts
import { prisma } from '@/lib/db'
import type { CaptureSession, Handedness, SwingClip } from '@prisma/client'
import { getRequirement } from './protocol'

export interface RegisterClipInput {
  sessionId: string
  requirementId: string
  swingIndex: number
  storageKey: string
  handedness: Handedness
  durationMs: number
}

export type CaptureSessionWithClips = CaptureSession & { clips: SwingClip[] }

export async function startSession(userId: string): Promise<CaptureSession> {
  return prisma.captureSession.create({ data: { userId } })
}

export async function registerClip(input: RegisterClipInput): Promise<SwingClip> {
  const requirement = getRequirement(input.requirementId)
  if (!requirement) throw new Error(`Unknown requirement id: ${input.requirementId}`)

  if (input.swingIndex < 0 || input.swingIndex >= requirement.swings) {
    throw new Error(
      `Swing index ${input.swingIndex} is out of range for ${requirement.id}, which requires ${requirement.swings} swings`,
    )
  }

  const key = {
    sessionId: input.sessionId,
    requirementId: input.requirementId,
    swingIndex: input.swingIndex,
  }

  return prisma.swingClip.upsert({
    where: { sessionId_requirementId_swingIndex: key },
    update: {
      storageKey: input.storageKey,
      handedness: input.handedness,
      durationMs: input.durationMs,
    },
    create: { ...key, storageKey: input.storageKey, handedness: input.handedness, durationMs: input.durationMs },
  })
}

export async function getSessionWithClips(
  sessionId: string,
): Promise<CaptureSessionWithClips | null> {
  return prisma.captureSession.findUnique({
    where: { id: sessionId },
    include: { clips: { orderBy: [{ requirementId: 'asc' }, { swingIndex: 'asc' }] } },
  })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/combine/session.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/combine/session.ts tests/domain/combine/session.test.ts
git commit -m "feat: capture sessions and swing clips"
```

---

### Task 4: Completeness evaluation

Pure function. This is what tells the golfer what is left and what enforces three swings.

**Files:**
- Create: `src/domain/combine/completeness.ts`
- Test: `tests/domain/combine/completeness.test.ts`

**Interfaces:**
- Consumes: `COMBINE_PROTOCOL` from `./protocol`.
- Produces:
  - `evaluateSessionCompleteness(clips: ClipSummary[]): CompletenessReport`
  - `ClipSummary` — `{ requirementId: string; swingIndex: number }`
  - `CompletenessReport` — `{ complete: boolean; totalRequired: number; totalCaptured: number; missing: { requirementId: string; missingSwings: number[] }[]; completeDomains: SkillDomain[] }`

- [ ] **Step 1: Write the failing test**

`tests/domain/combine/completeness.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COMBINE_PROTOCOL } from '@/domain/combine/protocol'
import { evaluateSessionCompleteness } from '@/domain/combine/completeness'

function allClips() {
  return COMBINE_PROTOCOL.flatMap((r) =>
    Array.from({ length: r.swings }, (_, i) => ({ requirementId: r.id, swingIndex: i })),
  )
}

describe('completeness', () => {
  it('reports an empty session as incomplete with everything missing', () => {
    const report = evaluateSessionCompleteness([])
    expect(report.complete).toBe(false)
    expect(report.totalCaptured).toBe(0)
    expect(report.missing).toHaveLength(COMBINE_PROTOCOL.length)
    expect(report.completeDomains).toEqual([])
  })

  it('reports a full session as complete', () => {
    const report = evaluateSessionCompleteness(allClips())
    expect(report.complete).toBe(true)
    expect(report.totalCaptured).toBe(report.totalRequired)
    expect(report.missing).toEqual([])
  })

  it('refuses to call a shot done with only two of three swings', () => {
    const clips = allClips().filter(
      (c) => !(c.requirementId === 'driver_face_on' && c.swingIndex === 2),
    )
    const report = evaluateSessionCompleteness(clips)
    expect(report.complete).toBe(false)
    expect(report.missing).toEqual([{ requirementId: 'driver_face_on', missingSwings: [2] }])
  })

  it('reports a domain complete when all of its shots are done', () => {
    const putting = COMBINE_PROTOCOL.filter((r) => r.domain === 'PUTTING')
    const clips = putting.flatMap((r) =>
      Array.from({ length: r.swings }, (_, i) => ({ requirementId: r.id, swingIndex: i })),
    )
    const report = evaluateSessionCompleteness(clips)
    expect(report.completeDomains).toEqual(['PUTTING'])
    expect(report.complete).toBe(false)
  })

  it('ignores clips for requirements that are not in the protocol', () => {
    const report = evaluateSessionCompleteness([
      ...allClips(),
      { requirementId: 'ghost_shot', swingIndex: 0 },
    ])
    expect(report.complete).toBe(true)
    expect(report.totalCaptured).toBe(report.totalRequired)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/combine/completeness.test.ts`
Expected: FAIL — cannot resolve `@/domain/combine/completeness`.

- [ ] **Step 3: Write the module**

`src/domain/combine/completeness.ts`:

```ts
import type { SkillDomain } from '@prisma/client'
import { COMBINE_PROTOCOL } from './protocol'

export interface ClipSummary {
  requirementId: string
  swingIndex: number
}

export interface MissingShot {
  requirementId: string
  missingSwings: number[]
}

export interface CompletenessReport {
  complete: boolean
  totalRequired: number
  totalCaptured: number
  missing: MissingShot[]
  completeDomains: SkillDomain[]
}

export function evaluateSessionCompleteness(clips: ClipSummary[]): CompletenessReport {
  const captured = new Map<string, Set<number>>()
  for (const clip of clips) {
    if (!captured.has(clip.requirementId)) captured.set(clip.requirementId, new Set())
    captured.get(clip.requirementId)!.add(clip.swingIndex)
  }

  const missing: MissingShot[] = []
  let totalRequired = 0
  let totalCaptured = 0

  for (const requirement of COMBINE_PROTOCOL) {
    totalRequired += requirement.swings
    const have = captured.get(requirement.id) ?? new Set<number>()

    const missingSwings: number[] = []
    for (let i = 0; i < requirement.swings; i++) {
      if (have.has(i)) totalCaptured++
      else missingSwings.push(i)
    }
    if (missingSwings.length > 0) missing.push({ requirementId: requirement.id, missingSwings })
  }

  const incompleteDomains = new Set(
    missing.map((m) => COMBINE_PROTOCOL.find((r) => r.id === m.requirementId)!.domain),
  )
  const completeDomains = [...new Set(COMBINE_PROTOCOL.map((r) => r.domain))]
    .filter((d) => !incompleteDomains.has(d))
    .sort()

  return { complete: missing.length === 0, totalRequired, totalCaptured, missing, completeDomains }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/combine/completeness.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/combine/completeness.ts tests/domain/combine/completeness.test.ts
git commit -m "feat: combine completeness evaluation enforcing three swings"
```

---

### Task 5: Consent-gated capture API

Proves the Foundation plan's gate actually guards something.

**Files:**
- Create: `src/app/api/combine/session/route.ts`
- Create: `src/app/api/combine/clip/route.ts`
- Create: `src/lib/storage.ts`
- Test: `tests/app/api/combine.test.ts`

**Interfaces:**
- Consumes: `missingRequiredConsents` from `@/domain/consent/gate`; `startSession`, `registerClip`, `getSessionWithClips` from `@/domain/combine/session`; `evaluateSessionCompleteness` from `@/domain/combine/completeness`; `StoragePort`.
- Produces: `POST /api/combine/session`, `GET /api/combine/session?sessionId=`, `POST /api/combine/clip`.

- [ ] **Step 1: Write the failing test**

`tests/app/api/combine.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { InMemoryStorage } from '@/domain/storage/memory'

vi.mock('@/lib/storage', () => ({ storage: new InMemoryStorage() }))

const { POST: createSession, GET: readSession } = await import('@/app/api/combine/session/route')
const { POST: createClip } = await import('@/app/api/combine/clip/route')

async function makeConsentedUser(email: string) {
  const user = await prisma.user.create({ data: { email, dateOfBirth: new Date('1985-01-01') } })
  const docs = await prisma.consentDocument.findMany({ where: { required: true } })
  for (const doc of docs) {
    if (doc.kind === 'MINOR_PARENTAL') continue
    await prisma.consentAcceptance.create({ data: { userId: user.id, documentId: doc.id } })
  }
  return user
}

beforeEach(async () => {
  await prisma.swingClip.deleteMany()
  await prisma.captureSession.deleteMany()
  await prisma.consentAcceptance.deleteMany()
  await prisma.consentDocument.deleteMany()
  await prisma.user.deleteMany()
  for (const kind of ['WAIVER', 'HEALTH_ATTESTATION', 'ON_COURSE_DISCLAIMER'] as const) {
    await prisma.consentDocument.create({
      data: { kind, version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
  }
})

describe('capture API', () => {
  it('refuses to start a session for a user with outstanding consents', async () => {
    const user = await prisma.user.create({ data: { email: 'blocked@example.com' } })
    const res = await createSession(
      new Request('http://t/api/combine/session', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).missing).toContain('WAIVER')
  })

  it('starts a session for a consented user', async () => {
    const user = await makeConsentedUser('ok@example.com')
    const res = await createSession(
      new Request('http://t/api/combine/session', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).sessionId).toBeTruthy()
  })

  it('issues an upload URL and registers the clip', async () => {
    const user = await makeConsentedUser('up@example.com')
    const started = await (
      await createSession(
        new Request('http://t/api/combine/session', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        }),
      )
    ).json()

    const res = await createClip(
      new Request('http://t/api/combine/clip', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionId: started.sessionId,
          requirementId: 'driver_face_on',
          swingIndex: 0,
          handedness: 'LEFT',
          durationMs: 4100,
        }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.uploadUrl).toContain('memory://upload/')
  })

  it('reports remaining shots on the session', async () => {
    const user = await makeConsentedUser('rep@example.com')
    const started = await (
      await createSession(
        new Request('http://t/api/combine/session', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        }),
      )
    ).json()

    const res = await readSession(
      new Request(`http://t/api/combine/session?sessionId=${started.sessionId}`),
    )
    const body = await res.json()
    expect(body.completeness.complete).toBe(false)
    expect(body.completeness.totalCaptured).toBe(0)
    expect(body.completeness.totalRequired).toBe(24)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/app/api/combine.test.ts`
Expected: FAIL — cannot resolve `@/app/api/combine/session/route`.

- [ ] **Step 3: Write the storage singleton and both routes**

`src/lib/storage.ts`:

```ts
import { S3Client } from '@aws-sdk/client-s3'
import { S3Storage } from '@/domain/storage/s3'
import type { StoragePort } from '@/domain/storage/port'

export const storage: StoragePort = new S3Storage(
  new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' }),
  process.env.CLIP_BUCKET ?? 'golf-clips-dev',
)
```

`src/app/api/combine/session/route.ts`:

```ts
import { z } from 'zod'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { startSession, getSessionWithClips } from '@/domain/combine/session'
import { evaluateSessionCompleteness } from '@/domain/combine/completeness'

const postSchema = z.object({ userId: z.string().min(1) })

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const missing = await missingRequiredConsents(parsed.data.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  const session = await startSession(parsed.data.userId)
  return Response.json({ sessionId: session.id })
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (!sessionId) return Response.json({ error: 'sessionId is required' }, { status: 400 })

  const session = await getSessionWithClips(sessionId)
  if (!session) return Response.json({ error: 'session not found' }, { status: 404 })

  return Response.json({
    sessionId: session.id,
    status: session.status,
    completeness: evaluateSessionCompleteness(session.clips),
  })
}
```

`src/app/api/combine/clip/route.ts`:

```ts
import { z } from 'zod'
import { storage } from '@/lib/storage'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { registerClip } from '@/domain/combine/session'

const postSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  requirementId: z.string().min(1),
  swingIndex: z.number().int().min(0),
  handedness: z.enum(['LEFT', 'RIGHT']),
  durationMs: z.number().int().positive(),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const input = parsed.data
  const missing = await missingRequiredConsents(input.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  const key = `clips/${input.sessionId}/${input.requirementId}-${input.swingIndex}.mp4`
  const target = await storage.createUploadUrl(key, 'video/mp4')

  try {
    await registerClip({
      sessionId: input.sessionId,
      requirementId: input.requirementId,
      swingIndex: input.swingIndex,
      storageKey: target.key,
      handedness: input.handedness,
      durationMs: input.durationMs,
    })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }

  return Response.json({ uploadUrl: target.url, key: target.key, expiresAt: target.expiresAt })
}
```

- [ ] **Step 4: Run the whole suite**

Run: `pnpm test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/combine src/lib/storage.ts tests/app/api/combine.test.ts
git commit -m "feat: consent-gated Video Combine capture API"
```

---

## Done when

- `pnpm test` passes.
- A user with any outstanding required consent gets 403 from every capture endpoint.
- A shot with two of three swings is never reported complete.
- Left-handed capture is stored and returned as `LEFT`, with no right-handed default anywhere in the path.
