import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createSession } from '@/domain/auth/session'
import { resetDatabase } from '../../reset'

const { GET } = await import('@/app/api/dashboard/route')
const { POST: issueSession, DELETE: logout } = await import('@/app/api/auth/session/route')

async function makeUser(email: string) {
  return prisma.user.create({ data: { email } })
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  delete process.env.DEV_AUTH
})

describe('GET /api/dashboard', () => {
  it('401s without a session', async () => {
    const res = await GET(new Request('http://t/api/dashboard'))
    expect(res.status).toBe(401)
  })

  it('401s with a bogus token', async () => {
    const res = await GET(
      new Request('http://t/api/dashboard', { headers: { authorization: 'Bearer nope' } }),
    )
    expect(res.status).toBe(401)
  })

  it('returns the summary for a valid Bearer session', async () => {
    const user = await makeUser('dash@example.com')
    const { token } = await createSession(user.id)
    const res = await GET(
      new Request('http://t/api/dashboard', { headers: { authorization: `Bearer ${token}` } }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.student.email).toBe('dash@example.com')
    expect(body.programs).toEqual([])
  })

  it('accepts the pp_session cookie too', async () => {
    const user = await makeUser('cookie@example.com')
    const { token } = await createSession(user.id)
    const res = await GET(
      new Request('http://t/api/dashboard', { headers: { cookie: `pp_session=${token}` } }),
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/auth/session (dev-gated)', () => {
  it('is disabled (404) unless DEV_AUTH=1', async () => {
    const user = await makeUser('devoff@example.com')
    const res = await issueSession(
      new Request('http://t/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('issues a working token for an existing user when enabled', async () => {
    process.env.DEV_AUTH = '1'
    const user = await makeUser('devon@example.com')
    const res = await issueSession(
      new Request('http://t/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      }),
    )
    expect(res.status).toBe(200)
    const { token } = await res.json()
    expect(token).toBeTruthy()

    const dash = await GET(
      new Request('http://t/api/dashboard', { headers: { authorization: `Bearer ${token}` } }),
    )
    expect(dash.status).toBe(200)
  })

  it('404s for an unknown email when enabled', async () => {
    process.env.DEV_AUTH = '1'
    const res = await issueSession(
      new Request('http://t/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: 'ghost@example.com' }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('logout revokes the token', async () => {
    const user = await makeUser('bye@example.com')
    const { token } = await createSession(user.id)
    const out = await logout(
      new Request('http://t/api/auth/session', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      }),
    )
    expect(out.status).toBe(200)
    const dash = await GET(
      new Request('http://t/api/dashboard', { headers: { authorization: `Bearer ${token}` } }),
    )
    expect(dash.status).toBe(401)
  })
})
