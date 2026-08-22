# Course Directory and Round Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browsable course directory — country to state to course to hole — ingested from OpenStreetMap, illustrated with legally clean imagery, and backed by per-hole round records that let the pro prepare for a student's upcoming round in advance.

**Architecture:** A one-way ingest pipeline pulls golf features from the Overpass API and normalises them into `Course`, `Hole`, and `CourseFeature` rows carrying a coverage grade. The directory is read-only browse over that data. Round records are user-entered, hole-by-hole, and are the input that later makes a dispersion model possible. Media rows cannot exist without a recorded licence.

**Tech Stack:** Next.js 15, TypeScript 5, Prisma 6, PostgreSQL 16, Vitest, Zod, Overpass API, `@turf/*` for geometry.

## Global Constraints

- Requires the Foundation plan (`2026-08-22-foundation-and-extraction-kit.md`). Consumes `prisma` and `missingRequiredConsents`.
- Package manager is **pnpm**.
- **No scraped third-party directory content.** Course names, descriptions, and photography from commercial directories (AllSquare, GolfNow, Golf Advisor, and the like) are their copyrighted content. The only ingest source in this plan is OpenStreetMap.
- **Every media row must carry a licence.** `CourseMedia.licence` is non-nullable and `CourseMedia.sourceUrl` is non-nullable. There is no code path that stores an image without provenance. Permitted values at launch: `NAIP_PUBLIC_DOMAIN`, `SENTINEL2_COPERNICUS`, `WIKIMEDIA_CC`, `USER_SUBMITTED`, `COURSE_PROVIDED`.
- OpenStreetMap data is **ODbL**. Attribution is rendered on every page displaying OSM-derived data, and the licensing review in the spec's open items must complete before public launch.
- **Coverage is labelled, never implied.** Every course carries a `coverage` grade and the UI must display it. A course we have not charted well says so.
- Total world course count is **33,000–38,000 depending on source** and is not asserted as a precise figure anywhere in code or copy.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/domain/course/overpass.ts` | Overpass API client. Network only, no normalisation. |
| `src/domain/course/normalise.ts` | Pure: raw OSM elements → course/hole/feature shapes. |
| `src/domain/course/coverage.ts` | Pure: grade how well a course is charted. |
| `src/domain/course/ingest.ts` | Orchestrates fetch → normalise → persist. |
| `src/domain/course/directory.ts` | Browse queries: regions, courses, one course. |
| `src/domain/course/media.ts` | Media with enforced provenance. |
| `src/domain/round/record.ts` | Round and per-hole score entry. |
| `src/domain/round/prep.ts` | The pro's pre-round preparation view. |
| `src/app/api/courses/[...path]/route.ts` | Directory HTTP surface. |
| `src/app/api/rounds/route.ts` | Round entry HTTP surface. |

---

### Task 1: Overpass ingest and normalisation

**Files:**
- Create: `src/domain/course/overpass.ts`
- Create: `src/domain/course/normalise.ts`
- Test: `tests/domain/course/normalise.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `fetchCourseElements(areaQuery: string): Promise<OsmElement[]>`
  - `OsmElement` — `{ type: 'node'|'way'|'relation'; id: number; tags?: Record<string,string>; geometry?: { lat: number; lon: number }[] }`
  - `normaliseCourse(elements: OsmElement[]): NormalisedCourse | null`
  - `NormalisedCourse` — `{ osmId: string; name: string; holes: NormalisedHole[]; features: NormalisedFeature[]; centroid: { lat: number; lon: number } }`
  - `NormalisedHole` — `{ number: number; par: number | null; lengthMeters: number | null; path: {lat,lon}[] }`
  - `NormalisedFeature` — `{ kind: 'GREEN'|'BUNKER'|'WATER'|'FAIRWAY'|'TEE'|'ROUGH'; holeNumber: number | null; polygon: {lat,lon}[] }`

- [ ] **Step 1: Write the failing test**

`tests/domain/course/normalise.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normaliseCourse } from '@/domain/course/normalise'

const courseWay = {
  type: 'way' as const,
  id: 1,
  tags: { leisure: 'golf_course', name: 'Testing Links' },
  geometry: [
    { lat: 35.0, lon: -106.0 },
    { lat: 35.01, lon: -106.0 },
    { lat: 35.01, lon: -106.01 },
  ],
}

const holeWay = {
  type: 'way' as const,
  id: 2,
  tags: { golf: 'hole', ref: '1', par: '4', dist: '380' },
  geometry: [
    { lat: 35.0, lon: -106.0 },
    { lat: 35.003, lon: -106.003 },
  ],
}

const greenWay = {
  type: 'way' as const,
  id: 3,
  tags: { golf: 'green', ref: '1' },
  geometry: [
    { lat: 35.003, lon: -106.003 },
    { lat: 35.0031, lon: -106.003 },
    { lat: 35.0031, lon: -106.0031 },
  ],
}

describe('normaliseCourse', () => {
  it('returns null when no golf course element is present', () => {
    expect(normaliseCourse([holeWay])).toBeNull()
  })

  it('extracts the course name and osm id', () => {
    const course = normaliseCourse([courseWay, holeWay])!
    expect(course.name).toBe('Testing Links')
    expect(course.osmId).toBe('way/1')
  })

  it('extracts holes with par and length', () => {
    const course = normaliseCourse([courseWay, holeWay])!
    expect(course.holes).toHaveLength(1)
    expect(course.holes[0]).toMatchObject({ number: 1, par: 4, lengthMeters: 380 })
  })

  it('tolerates a hole with no par or distance tag', () => {
    const bare = { ...holeWay, id: 4, tags: { golf: 'hole', ref: '2' } }
    const course = normaliseCourse([courseWay, bare])!
    expect(course.holes[0]).toMatchObject({ number: 2, par: null, lengthMeters: null })
  })

  it('maps golf feature tags to feature kinds and attaches them to a hole', () => {
    const course = normaliseCourse([courseWay, holeWay, greenWay])!
    expect(course.features).toHaveLength(1)
    expect(course.features[0]).toMatchObject({ kind: 'GREEN', holeNumber: 1 })
  })

  it('computes a centroid from the course geometry', () => {
    const course = normaliseCourse([courseWay])!
    expect(course.centroid.lat).toBeCloseTo(35.0067, 3)
    expect(course.centroid.lon).toBeCloseTo(-106.0033, 3)
  })

  it('ignores golf tags it does not recognise', () => {
    const odd = { type: 'way' as const, id: 9, tags: { golf: 'clubhouse' }, geometry: [{ lat: 35, lon: -106 }] }
    const course = normaliseCourse([courseWay, odd])!
    expect(course.features).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/course/normalise.test.ts`
Expected: FAIL — cannot resolve `@/domain/course/normalise`.

- [ ] **Step 3: Write the normaliser**

`src/domain/course/normalise.ts`:

```ts
export interface LatLon {
  lat: number
  lon: number
}

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  geometry?: LatLon[]
}

export type FeatureKind = 'GREEN' | 'BUNKER' | 'WATER' | 'FAIRWAY' | 'TEE' | 'ROUGH'

export interface NormalisedHole {
  number: number
  par: number | null
  lengthMeters: number | null
  path: LatLon[]
}

export interface NormalisedFeature {
  kind: FeatureKind
  holeNumber: number | null
  polygon: LatLon[]
}

export interface NormalisedCourse {
  osmId: string
  name: string
  holes: NormalisedHole[]
  features: NormalisedFeature[]
  centroid: LatLon
}

const FEATURE_TAGS: Record<string, FeatureKind> = {
  green: 'GREEN',
  bunker: 'BUNKER',
  water_hazard: 'WATER',
  lateral_water_hazard: 'WATER',
  fairway: 'FAIRWAY',
  tee: 'TEE',
  rough: 'ROUGH',
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function centroidOf(points: LatLon[]): LatLon {
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
  const lon = points.reduce((sum, p) => sum + p.lon, 0) / points.length
  return { lat, lon }
}

export function normaliseCourse(elements: OsmElement[]): NormalisedCourse | null {
  const courseElement = elements.find((e) => e.tags?.leisure === 'golf_course')
  if (!courseElement?.geometry?.length) return null

  const holes: NormalisedHole[] = []
  const features: NormalisedFeature[] = []

  for (const element of elements) {
    const golf = element.tags?.golf
    if (!golf || !element.geometry?.length) continue

    if (golf === 'hole') {
      const number = toNumber(element.tags?.ref)
      if (number === null) continue
      holes.push({
        number,
        par: toNumber(element.tags?.par),
        lengthMeters: toNumber(element.tags?.dist),
        path: element.geometry,
      })
      continue
    }

    const kind = FEATURE_TAGS[golf]
    if (!kind) continue
    features.push({
      kind,
      holeNumber: toNumber(element.tags?.ref),
      polygon: element.geometry,
    })
  }

  return {
    osmId: `${courseElement.type}/${courseElement.id}`,
    name: courseElement.tags?.name ?? 'Unnamed course',
    holes: holes.sort((a, b) => a.number - b.number),
    features,
    centroid: centroidOf(courseElement.geometry),
  }
}
```

- [ ] **Step 4: Write the Overpass client**

`src/domain/course/overpass.ts`:

```ts
import type { OsmElement } from './normalise'

const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter'

/**
 * areaQuery is an Overpass area filter, e.g. `["ISO3166-2"="US-NM"]`.
 * Returns every golf element inside that area with full geometry.
 */
export async function fetchCourseElements(areaQuery: string): Promise<OsmElement[]> {
  const query = `
    [out:json][timeout:180];
    area${areaQuery}->.searchArea;
    (
      way["leisure"="golf_course"](area.searchArea);
      way["golf"](area.searchArea);
      relation["leisure"="golf_course"](area.searchArea);
    );
    out geom;
  `

  const response = await fetch(OVERPASS_URL, { method: 'POST', body: query })
  if (!response.ok) throw new Error(`Overpass request failed: ${response.status}`)

  const payload = (await response.json()) as { elements: OsmElement[] }
  return payload.elements
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm test tests/domain/course/normalise.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain/course/overpass.ts src/domain/course/normalise.ts tests/domain/course/normalise.test.ts
git commit -m "feat: OSM Overpass ingest and course normalisation"
```

---

### Task 2: Coverage grading

Honest labelling of how well each course is charted.

**Files:**
- Create: `src/domain/course/coverage.ts`
- Test: `tests/domain/course/coverage.test.ts`

**Interfaces:**
- Consumes: `NormalisedCourse` from `./normalise`.
- Produces:
  - `gradeCoverage(course: NormalisedCourse): CoverageGrade`
  - `CoverageGrade` = `'LISTED' | 'ROUTED' | 'DETAILED' | 'VERIFIED'`
  - `COVERAGE_LABELS: Record<CoverageGrade, string>` — user-facing copy.

- [ ] **Step 1: Write the failing test**

`tests/domain/course/coverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gradeCoverage, COVERAGE_LABELS } from '@/domain/course/coverage'
import type { NormalisedCourse } from '@/domain/course/normalise'

function course(over: Partial<NormalisedCourse> = {}): NormalisedCourse {
  return {
    osmId: 'way/1',
    name: 'Test',
    holes: [],
    features: [],
    centroid: { lat: 35, lon: -106 },
    ...over,
  }
}

function holes(n: number, withPar = true) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    par: withPar ? 4 : null,
    lengthMeters: withPar ? 380 : null,
    path: [{ lat: 35, lon: -106 }],
  }))
}

describe('coverage grading', () => {
  it('grades a course with no holes as LISTED', () => {
    expect(gradeCoverage(course())).toBe('LISTED')
  })

  it('grades a course with holes but no par data as ROUTED', () => {
    expect(gradeCoverage(course({ holes: holes(18, false) }))).toBe('ROUTED')
  })

  it('grades a full 18 with par but no hazards as ROUTED', () => {
    expect(gradeCoverage(course({ holes: holes(18) }))).toBe('ROUTED')
  })

  it('grades a full 18 with par and greens and bunkers as DETAILED', () => {
    const features = [
      { kind: 'GREEN' as const, holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
      { kind: 'BUNKER' as const, holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
    ]
    expect(gradeCoverage(course({ holes: holes(18), features }))).toBe('DETAILED')
  })

  it('never returns VERIFIED from geometry alone', () => {
    const features = [
      { kind: 'GREEN' as const, holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
      { kind: 'BUNKER' as const, holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
      { kind: 'WATER' as const, holeNumber: 2, polygon: [{ lat: 35, lon: -106 }] },
    ]
    expect(gradeCoverage(course({ holes: holes(18), features }))).not.toBe('VERIFIED')
  })

  it('gives every grade a user-facing label', () => {
    for (const grade of ['LISTED', 'ROUTED', 'DETAILED', 'VERIFIED'] as const) {
      expect(COVERAGE_LABELS[grade].length).toBeGreaterThan(5)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/course/coverage.test.ts`
Expected: FAIL — cannot resolve `@/domain/course/coverage`.

- [ ] **Step 3: Write the module**

`src/domain/course/coverage.ts`:

```ts
import type { NormalisedCourse } from './normalise'

export type CoverageGrade = 'LISTED' | 'ROUTED' | 'DETAILED' | 'VERIFIED'

/**
 * VERIFIED is never derived from geometry. It is only ever set by a human
 * confirming the chart against reality — a played round or a professional review.
 */
export const COVERAGE_LABELS: Record<CoverageGrade, string> = {
  LISTED: 'We know this course exists but have not charted its holes.',
  ROUTED: 'Hole routing charted from OpenStreetMap. Hazards may be incomplete.',
  DETAILED: 'Holes and hazards charted from OpenStreetMap. Not yet confirmed on the ground.',
  VERIFIED: 'Confirmed against play by a golfer or a professional.',
}

export function gradeCoverage(course: NormalisedCourse): CoverageGrade {
  if (course.holes.length === 0) return 'LISTED'

  const hasGreens = course.features.some((f) => f.kind === 'GREEN')
  const hasHazards = course.features.some((f) => f.kind === 'BUNKER' || f.kind === 'WATER')

  return hasGreens && hasHazards ? 'DETAILED' : 'ROUTED'
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test tests/domain/course/coverage.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/course/coverage.ts tests/domain/course/coverage.test.ts
git commit -m "feat: honest course coverage grading"
```

---

### Task 3: Course schema and directory browse

The clickable path: country → state → course.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/course/ingest.ts`
- Create: `src/domain/course/directory.ts`
- Test: `tests/domain/course/directory.test.ts`

**Interfaces:**
- Consumes: `normaliseCourse`, `gradeCoverage`, `prisma`.
- Produces:
  - `persistCourse(input: { normalised: NormalisedCourse; countryCode: string; regionCode: string; regionName: string }): Promise<Course>`
  - `listRegions(countryCode: string): Promise<{ regionCode: string; regionName: string; courseCount: number }[]>`
  - `listCourses(regionCode: string): Promise<Course[]>`
  - `getCourseBySlug(slug: string): Promise<CourseWithHoles | null>`
  - `slugify(name: string, regionCode: string): string`

- [ ] **Step 1: Write the failing test**

`tests/domain/course/directory.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { persistCourse } from '@/domain/course/ingest'
import { listRegions, listCourses, getCourseBySlug, slugify } from '@/domain/course/directory'
import type { NormalisedCourse } from '@/domain/course/normalise'

function normalised(name: string, osmId: string): NormalisedCourse {
  return {
    osmId,
    name,
    centroid: { lat: 35, lon: -106 },
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      lengthMeters: 380,
      path: [{ lat: 35, lon: -106 }],
    })),
    features: [
      { kind: 'GREEN', holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
      { kind: 'BUNKER', holeNumber: 1, polygon: [{ lat: 35, lon: -106 }] },
    ],
  }
}

beforeEach(async () => {
  await prisma.courseFeature.deleteMany()
  await prisma.hole.deleteMany()
  await prisma.course.deleteMany()
})

describe('course directory', () => {
  it('persists a course with its holes and grades coverage', async () => {
    const course = await persistCourse({
      normalised: normalised('Paako Ridge', 'way/100'),
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
    })
    expect(course.coverage).toBe('DETAILED')

    const holes = await prisma.hole.count({ where: { courseId: course.id } })
    expect(holes).toBe(18)
  })

  it('is idempotent on re-ingest of the same osm id', async () => {
    const input = {
      normalised: normalised('Paako Ridge', 'way/100'),
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
    }
    await persistCourse(input)
    await persistCourse(input)

    expect(await prisma.course.count()).toBe(1)
    expect(await prisma.hole.count()).toBe(18)
  })

  it('lists regions with course counts', async () => {
    await persistCourse({
      normalised: normalised('A', 'way/1'),
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
    })
    await persistCourse({
      normalised: normalised('B', 'way/2'),
      countryCode: 'US',
      regionCode: 'US-TX',
      regionName: 'Texas',
    })
    await persistCourse({
      normalised: normalised('C', 'way/3'),
      countryCode: 'US',
      regionCode: 'US-TX',
      regionName: 'Texas',
    })

    const regions = await listRegions('US')
    expect(regions).toEqual([
      { regionCode: 'US-NM', regionName: 'New Mexico', courseCount: 1 },
      { regionCode: 'US-TX', regionName: 'Texas', courseCount: 2 },
    ])
  })

  it('builds a unique slug per region', () => {
    expect(slugify('Paa-Ko Ridge Golf Club', 'US-NM')).toBe('us-nm/paa-ko-ridge-golf-club')
  })

  it('reads a course back by slug with its holes in order', async () => {
    const created = await persistCourse({
      normalised: normalised('Paako Ridge', 'way/100'),
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
    })

    const loaded = await getCourseBySlug(created.slug)
    expect(loaded?.holes[0]?.number).toBe(1)
    expect(loaded?.holes[17]?.number).toBe(18)
  })

  it('returns null for an unknown slug', async () => {
    expect(await getCourseBySlug('us-nm/nothing-here')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/course/directory.test.ts`
Expected: FAIL — cannot resolve `@/domain/course/ingest`.

- [ ] **Step 3: Extend the schema**

```prisma
enum CoverageGrade { LISTED ROUTED DETAILED VERIFIED }

enum FeatureKind { GREEN BUNKER WATER FAIRWAY TEE ROUGH }

model Course {
  id          String        @id @default(cuid())
  osmId       String        @unique
  slug        String        @unique
  name        String
  countryCode String
  regionCode  String
  regionName  String
  latitude    Float
  longitude   Float
  coverage    CoverageGrade @default(LISTED)
  holes       Hole[]
  features    CourseFeature[]
  media       CourseMedia[]
  rounds      Round[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([countryCode, regionCode])
}

model Hole {
  id           String        @id @default(cuid())
  courseId     String
  course       Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  number       Int
  par          Int?
  lengthMeters Float?
  path         Json
  scores       HoleScore[]

  @@unique([courseId, number])
}

model CourseFeature {
  id         String      @id @default(cuid())
  courseId   String
  course     Course      @relation(fields: [courseId], references: [id], onDelete: Cascade)
  kind       FeatureKind
  holeNumber Int?
  polygon    Json
}
```

- [ ] **Step 4: Write ingest and directory**

`src/domain/course/ingest.ts`:

```ts
import { prisma } from '@/lib/db'
import type { Course } from '@prisma/client'
import type { NormalisedCourse } from './normalise'
import { gradeCoverage } from './coverage'
import { slugify } from './directory'

export interface PersistCourseInput {
  normalised: NormalisedCourse
  countryCode: string
  regionCode: string
  regionName: string
}

export async function persistCourse(input: PersistCourseInput): Promise<Course> {
  const { normalised, countryCode, regionCode, regionName } = input

  const data = {
    slug: slugify(normalised.name, regionCode),
    name: normalised.name,
    countryCode,
    regionCode,
    regionName,
    latitude: normalised.centroid.lat,
    longitude: normalised.centroid.lon,
    coverage: gradeCoverage(normalised),
  }

  const course = await prisma.course.upsert({
    where: { osmId: normalised.osmId },
    update: data,
    create: { ...data, osmId: normalised.osmId },
  })

  await prisma.courseFeature.deleteMany({ where: { courseId: course.id } })

  for (const hole of normalised.holes) {
    await prisma.hole.upsert({
      where: { courseId_number: { courseId: course.id, number: hole.number } },
      update: { par: hole.par, lengthMeters: hole.lengthMeters, path: hole.path },
      create: {
        courseId: course.id,
        number: hole.number,
        par: hole.par,
        lengthMeters: hole.lengthMeters,
        path: hole.path,
      },
    })
  }

  for (const feature of normalised.features) {
    await prisma.courseFeature.create({
      data: {
        courseId: course.id,
        kind: feature.kind,
        holeNumber: feature.holeNumber,
        polygon: feature.polygon,
      },
    })
  }

  return course
}
```

`src/domain/course/directory.ts`:

```ts
import { prisma } from '@/lib/db'
import type { Course, Hole } from '@prisma/client'

export type CourseWithHoles = Course & { holes: Hole[] }

export function slugify(name: string, regionCode: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${regionCode.toLowerCase()}/${slug}`
}

export interface RegionSummary {
  regionCode: string
  regionName: string
  courseCount: number
}

export async function listRegions(countryCode: string): Promise<RegionSummary[]> {
  const grouped = await prisma.course.groupBy({
    by: ['regionCode', 'regionName'],
    where: { countryCode },
    _count: { _all: true },
    orderBy: { regionCode: 'asc' },
  })

  return grouped.map((row) => ({
    regionCode: row.regionCode,
    regionName: row.regionName,
    courseCount: row._count._all,
  }))
}

export async function listCourses(regionCode: string): Promise<Course[]> {
  return prisma.course.findMany({ where: { regionCode }, orderBy: { name: 'asc' } })
}

export async function getCourseBySlug(slug: string): Promise<CourseWithHoles | null> {
  return prisma.course.findUnique({
    where: { slug },
    include: { holes: { orderBy: { number: 'asc' } } },
  })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/course/directory.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/course/ingest.ts src/domain/course/directory.ts tests/domain/course/directory.test.ts
git commit -m "feat: course persistence and country/region/course directory"
```

---

### Task 4: Media with enforced provenance

No image enters the system without a recorded licence.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/course/media.ts`
- Test: `tests/domain/course/media.test.ts`

**Interfaces:**
- Consumes: `prisma`.
- Produces:
  - `addCourseMedia(input: AddCourseMediaInput): Promise<CourseMedia>`
  - `AddCourseMediaInput` — `{ courseId: string; storageKey: string; licence: MediaLicence; sourceUrl: string; attribution: string; holeNumber?: number }`
  - `MediaLicence` = `'NAIP_PUBLIC_DOMAIN' | 'SENTINEL2_COPERNICUS' | 'WIKIMEDIA_CC' | 'USER_SUBMITTED' | 'COURSE_PROVIDED'`
  - `BLOCKED_MEDIA_HOSTS: readonly string[]`

- [ ] **Step 1: Write the failing test**

`tests/domain/course/media.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { addCourseMedia } from '@/domain/course/media'

async function makeCourse() {
  return prisma.course.create({
    data: {
      osmId: `way/${Date.now()}`,
      slug: `us-nm/c${Date.now()}`,
      name: 'Test',
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
      latitude: 35,
      longitude: -106,
    },
  })
}

beforeEach(async () => {
  await prisma.courseMedia.deleteMany()
  await prisma.course.deleteMany()
})

describe('course media', () => {
  it('stores an image with its licence and attribution', async () => {
    const course = await makeCourse()
    const media = await addCourseMedia({
      courseId: course.id,
      storageKey: 'media/a.jpg',
      licence: 'NAIP_PUBLIC_DOMAIN',
      sourceUrl: 'https://naip-usdaonline.hub.arcgis.com/',
      attribution: 'USDA NAIP, public domain',
    })
    expect(media.licence).toBe('NAIP_PUBLIC_DOMAIN')
    expect(media.attribution).toContain('USDA')
  })

  it('rejects media with an empty attribution', async () => {
    const course = await makeCourse()
    await expect(
      addCourseMedia({
        courseId: course.id,
        storageKey: 'media/b.jpg',
        licence: 'USER_SUBMITTED',
        sourceUrl: 'https://example.com/upload',
        attribution: '   ',
      }),
    ).rejects.toThrow(/attribution/i)
  })

  it('rejects media sourced from a commercial golf directory', async () => {
    const course = await makeCourse()
    await expect(
      addCourseMedia({
        courseId: course.id,
        storageKey: 'media/c.jpg',
        licence: 'USER_SUBMITTED',
        sourceUrl: 'https://www.allsquaregolf.com/directory/golf-courses/new-mexico',
        attribution: 'AllSquare',
      }),
    ).rejects.toThrow(/not a permitted source/i)
  })

  it('attaches media to a specific hole when given', async () => {
    const course = await makeCourse()
    const media = await addCourseMedia({
      courseId: course.id,
      storageKey: 'media/d.jpg',
      licence: 'COURSE_PROVIDED',
      sourceUrl: 'https://example-golf-club.com/media',
      attribution: 'Example Golf Club',
      holeNumber: 7,
    })
    expect(media.holeNumber).toBe(7)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/course/media.test.ts`
Expected: FAIL — cannot resolve `@/domain/course/media`.

- [ ] **Step 3: Extend the schema**

Both `licence` and `sourceUrl` are non-nullable. That is the enforcement.

```prisma
enum MediaLicence {
  NAIP_PUBLIC_DOMAIN
  SENTINEL2_COPERNICUS
  WIKIMEDIA_CC
  USER_SUBMITTED
  COURSE_PROVIDED
}

model CourseMedia {
  id          String       @id @default(cuid())
  courseId    String
  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  holeNumber  Int?
  storageKey  String
  licence     MediaLicence
  sourceUrl   String
  attribution String
  createdAt   DateTime     @default(now())
}
```

- [ ] **Step 4: Write the module**

`src/domain/course/media.ts`:

```ts
import { prisma } from '@/lib/db'
import type { CourseMedia, MediaLicence } from '@prisma/client'

/**
 * Commercial golf directories hold copyright in their listings and photography.
 * Nothing sourced from them may enter the system, regardless of attribution.
 */
export const BLOCKED_MEDIA_HOSTS: readonly string[] = [
  'allsquaregolf.com',
  'golfnow.com',
  'golfadvisor.com',
  'golfpass.com',
  'leadingcourses.com',
]

export interface AddCourseMediaInput {
  courseId: string
  storageKey: string
  licence: MediaLicence
  sourceUrl: string
  attribution: string
  holeNumber?: number
}

export async function addCourseMedia(input: AddCourseMediaInput): Promise<CourseMedia> {
  if (input.attribution.trim().length === 0) {
    throw new Error('Media attribution is required and may not be blank')
  }

  const host = new URL(input.sourceUrl).hostname.replace(/^www\./, '')
  if (BLOCKED_MEDIA_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
    throw new Error(`${host} is not a permitted source for course media`)
  }

  return prisma.courseMedia.create({
    data: {
      courseId: input.courseId,
      storageKey: input.storageKey,
      licence: input.licence,
      sourceUrl: input.sourceUrl,
      attribution: input.attribution.trim(),
      holeNumber: input.holeNumber,
    },
  })
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/course/media.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/course/media.ts tests/domain/course/media.test.ts
git commit -m "feat: course media with enforced licence provenance"
```

---

### Task 5: Round records

Hole-by-hole entry. This is the data that later makes a dispersion model possible.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/domain/round/record.ts`
- Test: `tests/domain/round/record.test.ts`

**Interfaces:**
- Consumes: `prisma`.
- Produces:
  - `createRound(input: { userId: string; courseId: string; playedOn: Date }): Promise<Round>`
  - `recordHoleScore(input: RecordHoleScoreInput): Promise<HoleScore>`
  - `RecordHoleScoreInput` — `{ roundId: string; holeNumber: number; strokes: number; putts: number; fairwayHit: boolean | null; greenInRegulation: boolean; penalties: number }`
  - `summariseRound(roundId: string): Promise<RoundSummary>`
  - `RoundSummary` — `{ holesRecorded: number; totalStrokes: number; totalPutts: number; totalPenalties: number; greensInRegulation: number; fairwaysHit: number; fairwayOpportunities: number }`

- [ ] **Step 1: Write the failing test**

`tests/domain/round/record.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createRound, recordHoleScore, summariseRound } from '@/domain/round/record'

async function fixtures() {
  const user = await prisma.user.create({
    data: { email: `r${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  const course = await prisma.course.create({
    data: {
      osmId: `way/${Date.now()}`,
      slug: `us-nm/r${Date.now()}`,
      name: 'Test',
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
      latitude: 35,
      longitude: -106,
      holes: {
        create: Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, path: [] })),
      },
    },
  })
  return { user, course }
}

beforeEach(async () => {
  await prisma.holeScore.deleteMany()
  await prisma.round.deleteMany()
  await prisma.hole.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()
})

describe('round records', () => {
  it('creates a round against a course', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })
    expect(round.courseId).toBe(course.id)
  })

  it('records a hole score and summarises it', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })

    await recordHoleScore({
      roundId: round.id,
      holeNumber: 1,
      strokes: 5,
      putts: 2,
      fairwayHit: false,
      greenInRegulation: false,
      penalties: 1,
    })

    const summary = await summariseRound(round.id)
    expect(summary).toMatchObject({
      holesRecorded: 1,
      totalStrokes: 5,
      totalPutts: 2,
      totalPenalties: 1,
      greensInRegulation: 0,
      fairwaysHit: 0,
      fairwayOpportunities: 1,
    })
  })

  it('excludes holes with no fairway from fairway opportunities', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })

    await recordHoleScore({
      roundId: round.id,
      holeNumber: 1,
      strokes: 3,
      putts: 1,
      fairwayHit: null,
      greenInRegulation: true,
      penalties: 0,
    })

    const summary = await summariseRound(round.id)
    expect(summary.fairwayOpportunities).toBe(0)
    expect(summary.greensInRegulation).toBe(1)
  })

  it('overwrites a corrected hole rather than double counting', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })
    const base = { roundId: round.id, holeNumber: 1, putts: 2, fairwayHit: true, greenInRegulation: true, penalties: 0 }

    await recordHoleScore({ ...base, strokes: 6 })
    await recordHoleScore({ ...base, strokes: 4 })

    const summary = await summariseRound(round.id)
    expect(summary.holesRecorded).toBe(1)
    expect(summary.totalStrokes).toBe(4)
  })

  it('rejects a hole number the course does not have', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })

    await expect(
      recordHoleScore({
        roundId: round.id,
        holeNumber: 19,
        strokes: 4,
        putts: 2,
        fairwayHit: true,
        greenInRegulation: true,
        penalties: 0,
      }),
    ).rejects.toThrow(/hole 19/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/round/record.test.ts`
Expected: FAIL — cannot resolve `@/domain/round/record`.

- [ ] **Step 3: Extend the schema**

```prisma
model Round {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation("UserRounds", fields: [userId], references: [id])
  courseId  String
  course    Course      @relation(fields: [courseId], references: [id])
  playedOn  DateTime
  scores    HoleScore[]
  createdAt DateTime    @default(now())

  @@index([userId, playedOn])
}

model HoleScore {
  id                String   @id @default(cuid())
  roundId           String
  round             Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)
  holeId            String
  hole              Hole     @relation(fields: [holeId], references: [id])
  holeNumber        Int
  strokes           Int
  putts             Int
  fairwayHit        Boolean?
  greenInRegulation Boolean
  penalties         Int      @default(0)

  @@unique([roundId, holeNumber])
}
```

Add the back-relation to `User`:

```prisma
  rounds Round[] @relation("UserRounds")
```

- [ ] **Step 4: Write the module**

`src/domain/round/record.ts`:

```ts
import { prisma } from '@/lib/db'
import type { HoleScore, Round } from '@prisma/client'

export interface RecordHoleScoreInput {
  roundId: string
  holeNumber: number
  strokes: number
  putts: number
  fairwayHit: boolean | null
  greenInRegulation: boolean
  penalties: number
}

export interface RoundSummary {
  holesRecorded: number
  totalStrokes: number
  totalPutts: number
  totalPenalties: number
  greensInRegulation: number
  fairwaysHit: number
  fairwayOpportunities: number
}

export async function createRound(input: {
  userId: string
  courseId: string
  playedOn: Date
}): Promise<Round> {
  return prisma.round.create({ data: input })
}

export async function recordHoleScore(input: RecordHoleScoreInput): Promise<HoleScore> {
  const round = await prisma.round.findUniqueOrThrow({ where: { id: input.roundId } })

  const hole = await prisma.hole.findUnique({
    where: { courseId_number: { courseId: round.courseId, number: input.holeNumber } },
  })
  if (!hole) throw new Error(`This course has no hole ${input.holeNumber}`)

  const data = {
    holeId: hole.id,
    holeNumber: input.holeNumber,
    strokes: input.strokes,
    putts: input.putts,
    fairwayHit: input.fairwayHit,
    greenInRegulation: input.greenInRegulation,
    penalties: input.penalties,
  }

  return prisma.holeScore.upsert({
    where: { roundId_holeNumber: { roundId: input.roundId, holeNumber: input.holeNumber } },
    update: data,
    create: { roundId: input.roundId, ...data },
  })
}

export async function summariseRound(roundId: string): Promise<RoundSummary> {
  const scores = await prisma.holeScore.findMany({ where: { roundId } })

  return {
    holesRecorded: scores.length,
    totalStrokes: scores.reduce((sum, s) => sum + s.strokes, 0),
    totalPutts: scores.reduce((sum, s) => sum + s.putts, 0),
    totalPenalties: scores.reduce((sum, s) => sum + s.penalties, 0),
    greensInRegulation: scores.filter((s) => s.greenInRegulation).length,
    fairwaysHit: scores.filter((s) => s.fairwayHit === true).length,
    fairwayOpportunities: scores.filter((s) => s.fairwayHit !== null).length,
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm db:push && pnpm test tests/domain/round/record.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/domain/round/record.ts tests/domain/round/record.test.ts
git commit -m "feat: hole-by-hole round records"
```

---

### Task 6: Pre-round preparation view

What the pro opens when a student says "I'm playing there Saturday."

**Files:**
- Create: `src/domain/round/prep.ts`
- Test: `tests/domain/round/prep.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`, `COVERAGE_LABELS` from `@/domain/course/coverage`. (Does not use `getCourseBySlug` — the brief needs `features` included, which that function does not return.)
- Produces:
  - `buildPrepBrief(input: { userId: string; courseSlug: string }): Promise<PrepBrief>`
  - `PrepBrief` — `{ courseName: string; coverage: CoverageGrade; coverageLabel: string; holes: PrepHole[]; playerHistory: { roundsAtCourse: number; averageStrokes: number | null } }`
  - `PrepHole` — `{ number: number; par: number | null; lengthMeters: number | null; hazards: FeatureKind[]; playerAverageStrokes: number | null; playerPenaltyRate: number | null }`

- [ ] **Step 1: Write the failing test**

`tests/domain/round/prep.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { buildPrepBrief } from '@/domain/round/prep'
import { createRound, recordHoleScore } from '@/domain/round/record'

async function fixtures() {
  const user = await prisma.user.create({
    data: { email: `p${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  const course = await prisma.course.create({
    data: {
      osmId: `way/${Date.now()}`,
      slug: 'us-nm/prep-test',
      name: 'Prep Test',
      countryCode: 'US',
      regionCode: 'US-NM',
      regionName: 'New Mexico',
      latitude: 35,
      longitude: -106,
      coverage: 'DETAILED',
      holes: { create: [{ number: 1, par: 4, lengthMeters: 380, path: [] }, { number: 2, par: 3, path: [] }] },
      features: { create: [{ kind: 'WATER', holeNumber: 1, polygon: [] }] },
    },
  })
  return { user, course }
}

beforeEach(async () => {
  await prisma.holeScore.deleteMany()
  await prisma.round.deleteMany()
  await prisma.courseFeature.deleteMany()
  await prisma.hole.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()
})

describe('prep brief', () => {
  it('lists every hole with its hazards', async () => {
    const { user } = await fixtures()
    const brief = await buildPrepBrief({ userId: user.id, courseSlug: 'us-nm/prep-test' })

    expect(brief.holes).toHaveLength(2)
    expect(brief.holes[0]?.hazards).toEqual(['WATER'])
    expect(brief.holes[1]?.hazards).toEqual([])
  })

  it('states the coverage grade in words', async () => {
    const { user } = await fixtures()
    const brief = await buildPrepBrief({ userId: user.id, courseSlug: 'us-nm/prep-test' })
    expect(brief.coverage).toBe('DETAILED')
    expect(brief.coverageLabel).toMatch(/not yet confirmed/i)
  })

  it('reports no history for a golfer who has never played there', async () => {
    const { user } = await fixtures()
    const brief = await buildPrepBrief({ userId: user.id, courseSlug: 'us-nm/prep-test' })
    expect(brief.playerHistory).toEqual({ roundsAtCourse: 0, averageStrokes: null })
    expect(brief.holes[0]?.playerAverageStrokes).toBeNull()
  })

  it('averages this golfer past rounds hole by hole', async () => {
    const { user, course } = await fixtures()
    for (const strokes of [6, 4]) {
      const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-07-01') })
      await recordHoleScore({
        roundId: round.id,
        holeNumber: 1,
        strokes,
        putts: 2,
        fairwayHit: false,
        greenInRegulation: false,
        penalties: strokes === 6 ? 1 : 0,
      })
    }

    const brief = await buildPrepBrief({ userId: user.id, courseSlug: 'us-nm/prep-test' })
    expect(brief.playerHistory.roundsAtCourse).toBe(2)
    expect(brief.holes[0]?.playerAverageStrokes).toBe(5)
    expect(brief.holes[0]?.playerPenaltyRate).toBe(0.5)
  })

  it('throws for an unknown course', async () => {
    const { user } = await fixtures()
    await expect(
      buildPrepBrief({ userId: user.id, courseSlug: 'us-nm/nope' }),
    ).rejects.toThrow(/course not found/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test tests/domain/round/prep.test.ts`
Expected: FAIL — cannot resolve `@/domain/round/prep`.

- [ ] **Step 3: Write the module**

`src/domain/round/prep.ts`:

```ts
import { prisma } from '@/lib/db'
import type { CoverageGrade, FeatureKind } from '@prisma/client'
import { COVERAGE_LABELS } from '@/domain/course/coverage'

export interface PrepHole {
  number: number
  par: number | null
  lengthMeters: number | null
  hazards: FeatureKind[]
  playerAverageStrokes: number | null
  playerPenaltyRate: number | null
}

export interface PrepBrief {
  courseName: string
  coverage: CoverageGrade
  coverageLabel: string
  holes: PrepHole[]
  playerHistory: { roundsAtCourse: number; averageStrokes: number | null }
}

const HAZARD_KINDS: FeatureKind[] = ['WATER', 'BUNKER']

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export async function buildPrepBrief(input: {
  userId: string
  courseSlug: string
}): Promise<PrepBrief> {
  const course = await prisma.course.findUnique({
    where: { slug: input.courseSlug },
    include: { holes: { orderBy: { number: 'asc' } }, features: true },
  })
  if (!course) throw new Error(`Course not found: ${input.courseSlug}`)

  const rounds = await prisma.round.findMany({
    where: { userId: input.userId, courseId: course.id },
    include: { scores: true },
  })
  const allScores = rounds.flatMap((r) => r.scores)

  const holes: PrepHole[] = course.holes.map((hole) => {
    const scores = allScores.filter((s) => s.holeNumber === hole.number)
    return {
      number: hole.number,
      par: hole.par,
      lengthMeters: hole.lengthMeters,
      hazards: course.features
        .filter((f) => f.holeNumber === hole.number && HAZARD_KINDS.includes(f.kind))
        .map((f) => f.kind),
      playerAverageStrokes: mean(scores.map((s) => s.strokes)),
      playerPenaltyRate: mean(scores.map((s) => (s.penalties > 0 ? 1 : 0))),
    }
  })

  const strokesPerRound = rounds
    .filter((r) => r.scores.length > 0)
    .map((r) => r.scores.reduce((sum, s) => sum + s.strokes, 0))

  return {
    courseName: course.name,
    coverage: course.coverage,
    coverageLabel: COVERAGE_LABELS[course.coverage],
    holes,
    playerHistory: {
      roundsAtCourse: rounds.length,
      averageStrokes: mean(strokesPerRound),
    },
  }
}
```

- [ ] **Step 4: Run the whole suite**

Run: `pnpm test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add src/domain/round/prep.ts tests/domain/round/prep.test.ts
git commit -m "feat: pre-round preparation brief for the pro"
```

---

## Done when

- `pnpm test` passes.
- `listRegions('US')` returns all fifty states with live course counts once ingest has run.
- Every course page can state its coverage grade in plain words.
- No media row exists without a licence, a source URL, and an attribution, and no media can originate from a commercial golf directory.
- The pro can open a prep brief for any charted course and see that student's hole-by-hole history against it.

---

## Follow-on: Plan 4 (not in this plan)

The Monte Carlo strategy engine — sample a player's dispersion across hole geometry, minimise expected strokes, return an aim point and a club — depends on a dispersion model, which depends on accumulated round data from this plan. It is sequenced after, not deferred from, this work.
