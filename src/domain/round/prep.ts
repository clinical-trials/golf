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

/**
 * What the pro opens when a student says "I'm playing there Saturday": every
 * hole with its hazards, next to that student's own history on it.
 */
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
    playerHistory: { roundsAtCourse: rounds.length, averageStrokes: mean(strokesPerRound) },
  }
}
