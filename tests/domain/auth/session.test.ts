import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createSession, resolveSession, revokeSession } from '@/domain/auth/session'
import { readSessionToken } from '@/domain/auth/http'
import { resetDatabase } from '../../reset'

async function makeUser() {
  return prisma.user.create({ data: { email: `s${Date.now()}${Math.round(performance.now())}@example.com` } })
}

beforeEach(async () => {
  await resetDatabase()
})

describe('sessions', () => {
  it('issues a token that resolves to the user', async () => {
    const user = await makeUser()
    const { token } = await createSession(user.id)
    expect(token).toBeTruthy()
    expect(await resolveSession(token)).toBe(user.id)
  })

  it('stores only a hash, never the raw token', async () => {
    const user = await makeUser()
    const { token } = await createSession(user.id)
    const rows = await prisma.session.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].tokenHash).not.toBe(token)
    expect(rows[0].tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects unknown, empty and null tokens', async () => {
    expect(await resolveSession('nope')).toBeNull()
    expect(await resolveSession('')).toBeNull()
    expect(await resolveSession(null)).toBeNull()
    expect(await resolveSession(undefined)).toBeNull()
  })

  it('rejects and cleans up an expired token', async () => {
    const user = await makeUser()
    const { token } = await createSession(user.id, -1)
    expect(await resolveSession(token)).toBeNull()
    expect(await prisma.session.count()).toBe(0)
  })

  it('revokes a token (logout)', async () => {
    const user = await makeUser()
    const { token } = await createSession(user.id)
    await revokeSession(token)
    expect(await resolveSession(token)).toBeNull()
  })
})

describe('readSessionToken', () => {
  it('reads a Bearer header', () => {
    const req = new Request('http://t/', { headers: { authorization: 'Bearer abc123' } })
    expect(readSessionToken(req)).toBe('abc123')
  })

  it('falls back to the pp_session cookie', () => {
    const req = new Request('http://t/', { headers: { cookie: 'other=x; pp_session=tok%20en; a=b' } })
    expect(readSessionToken(req)).toBe('tok en')
  })

  it('returns null when neither is present', () => {
    expect(readSessionToken(new Request('http://t/'))).toBeNull()
  })
})
