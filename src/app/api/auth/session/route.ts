import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createSession, revokeSession } from '@/domain/auth/session'
import { readSessionToken } from '@/domain/auth/http'

const postSchema = z.object({ email: z.string().email() })

/**
 * POST /api/auth/session — DEV ONLY, gated behind DEV_AUTH=1.
 *
 * Issues a real session for an existing user by email. This is the seam where
 * passwordless email login (magic link) plugs in once the email channel ships
 * in item 2: the session machinery in src/domain/auth/session.ts is
 * production-real; only this issuance shortcut is dev-gated so the dashboard can
 * be exercised end-to-end before real login exists. Never set DEV_AUTH in
 * production — with it unset this route reports 404.
 */
export async function POST(request: Request): Promise<Response> {
  if (process.env.DEV_AUTH !== '1') {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) return Response.json({ error: 'no such user' }, { status: 404 })

  const session = await createSession(user.id)
  return Response.json({ token: session.token, expiresAt: session.expiresAt.toISOString() })
}

/** DELETE /api/auth/session — logout. Always available; safe with any token. */
export async function DELETE(request: Request): Promise<Response> {
  const token = readSessionToken(request)
  if (token) await revokeSession(token)
  return Response.json({ ok: true })
}
