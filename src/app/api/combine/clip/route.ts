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
