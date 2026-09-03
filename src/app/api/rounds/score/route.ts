import { z } from 'zod'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { recordHoleScore, summariseRound } from '@/domain/round/record'

const postSchema = z.object({
  userId: z.string().min(1),
  roundId: z.string().min(1),
  holeNumber: z.number().int().min(1).max(36),
  strokes: z.number().int().min(1).max(20),
  putts: z.number().int().min(0).max(10),
  fairwayHit: z.boolean().nullable(),
  greenInRegulation: z.boolean(),
  penalties: z.number().int().min(0).max(10),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const missing = await missingRequiredConsents(parsed.data.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  try {
    const { userId: _userId, ...score } = parsed.data
    await recordHoleScore(score)
    return Response.json({ summary: await summariseRound(parsed.data.roundId) })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
}
