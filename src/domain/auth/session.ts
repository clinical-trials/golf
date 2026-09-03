import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'

const DEFAULT_TTL_DAYS = 30

/** Tokens are stored only as their SHA-256 hash; the raw token is returned to
 *  the caller once and never persisted. Lookups hash the presented token and
 *  compare, so a database leak yields no usable sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface IssuedSession {
  token: string
  expiresAt: Date
}

/** Issues an opaque session for a user. `ttlDays` bounds how long it is valid. */
export async function createSession(userId: string, ttlDays = DEFAULT_TTL_DAYS): Promise<IssuedSession> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } })
  return { token, expiresAt }
}

/** Resolves a token to a userId, or null if the token is unknown or expired.
 *  Expired sessions are deleted opportunistically. */
export async function resolveSession(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.userId
}

/** Ends a session (logout). Safe to call with an already-invalid token. */
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}
