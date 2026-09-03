import { z } from 'zod'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { createRound } from '@/domain/round/record'
import { buildPrepBrief } from '@/domain/round/prep'

const postSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  playedOn: z.string().datetime(),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const missing = await missingRequiredConsents(parsed.data.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  const round = await createRound({
    userId: parsed.data.userId,
    courseId: parsed.data.courseId,
    playedOn: new Date(parsed.data.playedOn),
  })
  return Response.json({ roundId: round.id })
}

/** GET /api/rounds?userId=&courseSlug= — the pro's pre-round prep brief. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const userId = params.get('userId')
  const courseSlug = params.get('courseSlug')
  if (!userId || !courseSlug) {
    return Response.json({ error: 'userId and courseSlug are required' }, { status: 400 })
  }

  try {
    return Response.json(await buildPrepBrief({ userId, courseSlug }))
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 404 })
  }
}
