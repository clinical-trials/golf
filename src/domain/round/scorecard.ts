import { prisma } from '@/lib/db'
import type { OcrCell, OcrPort } from './ocr-port'
import { recordHoleScore } from './record'

/**
 * Nobody wants to type ninety numbers after four hours of golf, and handwritten
 * scorecards are genuinely hard to read — so OCR PROPOSES and the golfer
 * CONFIRMS. Nothing is written to a round from a photo alone, and cells the
 * reader was unsure about are flagged rather than silently accepted.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.85

export interface ProposedHole {
  holeNumber: number
  strokes: number | null
  putts: number | null
  lowConfidence: boolean
}

export interface ScorecardProposal {
  uploadId: string
  holes: ProposedHole[]
  needsReview: number[]
}

export interface ConfirmedHole {
  holeNumber: number
  strokes: number
  putts: number
  fairwayHit: boolean | null
  greenInRegulation: boolean
  penalties: number
}

export async function proposeRoundFromPhoto(input: {
  roundId: string
  storageKey: string
  ocr: OcrPort
}): Promise<ScorecardProposal> {
  const cells = await input.ocr.readScorecard(input.storageKey)

  const upload = await prisma.scorecardUpload.create({
    data: { roundId: input.roundId, storageKey: input.storageKey, rawCells: cells as unknown as object },
  })

  const byHole = new Map<number, OcrCell[]>()
  for (const cell of cells) {
    if (!byHole.has(cell.holeNumber)) byHole.set(cell.holeNumber, [])
    byHole.get(cell.holeNumber)!.push(cell)
  }

  const holes: ProposedHole[] = [...byHole.entries()]
    .sort(([a], [b]) => a - b)
    .map(([holeNumber, holeCells]) => ({
      holeNumber,
      strokes: holeCells.find((c) => c.field === 'strokes')?.value ?? null,
      putts: holeCells.find((c) => c.field === 'putts')?.value ?? null,
      lowConfidence: holeCells.some((c) => c.confidence < LOW_CONFIDENCE_THRESHOLD),
    }))

  return {
    uploadId: upload.id,
    holes,
    needsReview: holes.filter((h) => h.lowConfidence).map((h) => h.holeNumber),
  }
}

/** Writes the golfer's corrected values, never the raw OCR output. */
export async function confirmProposal(input: {
  uploadId: string
  holes: ConfirmedHole[]
}): Promise<number> {
  const upload = await prisma.scorecardUpload.findUnique({ where: { id: input.uploadId } })
  if (!upload) throw new Error(`No scorecard upload with id ${input.uploadId}`)

  for (const entry of input.holes) {
    await recordHoleScore({
      roundId: upload.roundId,
      holeNumber: entry.holeNumber,
      strokes: entry.strokes,
      putts: entry.putts,
      fairwayHit: entry.fairwayHit,
      greenInRegulation: entry.greenInRegulation,
      penalties: entry.penalties,
      provenance: 'OCR_CONFIRMED',
    })
  }

  await prisma.scorecardUpload.update({ where: { id: upload.id }, data: { confirmed: true } })
  return input.holes.length
}
