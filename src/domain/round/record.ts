import { prisma } from '@/lib/db'
import type { HoleScore, Round, ScoreProvenance } from '@prisma/client'

export interface RecordHoleScoreInput {
  roundId: string
  holeNumber: number
  strokes: number
  putts: number
  fairwayHit: boolean | null
  greenInRegulation: boolean
  penalties: number
  provenance?: ScoreProvenance
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
    provenance: input.provenance ?? ('MANUAL' as const),
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
