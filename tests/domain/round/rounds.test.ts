import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { importCourse, type CourseJson } from '@/domain/course/import'
import { createRound, recordHoleScore, summariseRound } from '@/domain/round/record'
import { StubOcr } from '@/domain/round/ocr-port'
import { proposeRoundFromPhoto, confirmProposal } from '@/domain/round/scorecard'
import { buildPrepBrief } from '@/domain/round/prep'
import { resetDatabase } from '../../reset'

const COURSE: CourseJson = {
  id: 'test-links',
  name: 'Test Links',
  place: 'Testville, USA',
  country: 'US',
  coverage: 'DETAILED',
  holes: [
    { number: 1, par: 4, meters: 350, strokeIndex: 10, path: [[35, -106], [35.003, -106.003]] },
    { number: 2, par: 3, meters: 150, strokeIndex: 18, path: [[35.004, -106.004], [35.005, -106.005]] },
  ],
  features: [
    { kind: 'WATER', hole: 1, ring: [[35.001, -106.001], [35.0011, -106.001], [35.0011, -106.0011]] },
    { kind: 'GREEN', hole: 2, ring: [[35.005, -106.005], [35.0051, -106.005], [35.0051, -106.0051]] },
    { kind: 'CLUBHOUSE' as any, hole: null, ring: [[35, -106]] },
  ],
}

async function fixtures() {
  const user = await prisma.user.create({
    data: { email: `r${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  const course = await importCourse(COURSE)
  return { user, course }
}

beforeEach(resetDatabase)

describe('course import', () => {
  it('imports holes and known features, skipping unknown kinds', async () => {
    const { course } = await fixtures()
    expect(course.coverage).toBe('DETAILED')
    expect(course.slug).toBe('us/test-links')
    expect(await prisma.hole.count({ where: { courseId: course.id } })).toBe(2)
    expect(await prisma.courseFeature.count({ where: { courseId: course.id } })).toBe(2)
  })

  it('is idempotent on re-import', async () => {
    await fixtures()
    await importCourse(COURSE)
    expect(await prisma.course.count()).toBe(1)
    expect(await prisma.hole.count()).toBe(2)
  })
})

describe('round records', () => {
  it('records a hole and summarises with manual provenance', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })

    const score = await recordHoleScore({
      roundId: round.id, holeNumber: 1, strokes: 5, putts: 2,
      fairwayHit: false, greenInRegulation: false, penalties: 1,
    })
    expect(score.provenance).toBe('MANUAL')

    const summary = await summariseRound(round.id)
    expect(summary).toMatchObject({ holesRecorded: 1, totalStrokes: 5, totalPenalties: 1, fairwayOpportunities: 1 })
  })

  it('rejects a hole the course does not have', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })
    await expect(
      recordHoleScore({
        roundId: round.id, holeNumber: 19, strokes: 4, putts: 2,
        fairwayHit: true, greenInRegulation: true, penalties: 0,
      }),
    ).rejects.toThrow(/hole 19/i)
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
})

describe('scorecard photo', () => {
  it('proposes without writing, flags low confidence, writes only on confirm', async () => {
    const { user, course } = await fixtures()
    const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-08-01') })
    const ocr = new StubOcr([
      { holeNumber: 1, field: 'strokes', value: 8, confidence: 0.31 },
      { holeNumber: 1, field: 'putts', value: 2, confidence: 0.98 },
      { holeNumber: 2, field: 'strokes', value: 3, confidence: 0.95 },
    ])

    const proposal = await proposeRoundFromPhoto({ roundId: round.id, storageKey: 'cards/a.jpg', ocr })
    expect(proposal.needsReview).toEqual([1])
    expect(await prisma.holeScore.count({ where: { roundId: round.id } })).toBe(0)

    const written = await confirmProposal({
      uploadId: proposal.uploadId,
      holes: [
        { holeNumber: 1, strokes: 6, putts: 2, fairwayHit: false, greenInRegulation: false, penalties: 0 },
        { holeNumber: 2, strokes: 3, putts: 1, fairwayHit: null, greenInRegulation: true, penalties: 0 },
      ],
    })
    expect(written).toBe(2)

    const one = await prisma.holeScore.findFirst({ where: { roundId: round.id, holeNumber: 1 } })
    expect(one?.strokes).toBe(6) // the golfer's correction, not the OCR's 8
    expect(one?.provenance).toBe('OCR_CONFIRMED')
  })

  it('rejects confirmation of an unknown upload', async () => {
    await expect(confirmProposal({ uploadId: 'nope', holes: [] })).rejects.toThrow(/upload/i)
  })
})

describe('prep brief', () => {
  it('shows hazards, coverage in words, and the player history', async () => {
    const { user, course } = await fixtures()
    for (const strokes of [6, 4]) {
      const round = await createRound({ userId: user.id, courseId: course.id, playedOn: new Date('2026-07-01') })
      await recordHoleScore({
        roundId: round.id, holeNumber: 1, strokes, putts: 2,
        fairwayHit: false, greenInRegulation: false, penalties: strokes === 6 ? 1 : 0,
      })
    }

    const brief = await buildPrepBrief({ userId: user.id, courseSlug: 'us/test-links' })
    expect(brief.holes[0]?.hazards).toEqual(['WATER'])
    expect(brief.coverageLabel).toMatch(/not yet confirmed/i)
    expect(brief.playerHistory.roundsAtCourse).toBe(2)
    expect(brief.holes[0]?.playerAverageStrokes).toBe(5)
    expect(brief.holes[0]?.playerPenaltyRate).toBe(0.5)
  })

  it('throws for an unknown course', async () => {
    const { user } = await fixtures()
    await expect(buildPrepBrief({ userId: user.id, courseSlug: 'us/nope' })).rejects.toThrow(/not found/i)
  })
})
