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
