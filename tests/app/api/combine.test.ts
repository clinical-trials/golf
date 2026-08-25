import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { InMemoryStorage } from '@/domain/storage/memory'
import { resetDatabase } from '../../reset'

vi.mock('@/lib/storage', () => ({ storage: new InMemoryStorage() }))

const { POST: createSession, GET: readSession } = await import('@/app/api/combine/session/route')
const { POST: createClip } = await import('@/app/api/combine/clip/route')

async function makeConsentedUser(email: string) {
  const user = await prisma.user.create({ data: { email, dateOfBirth: new Date('1985-01-01') } })
  const docs = await prisma.consentDocument.findMany({ where: { required: true } })
  for (const doc of docs) {
    if (doc.kind === 'MINOR_PARENTAL') continue
    await prisma.consentAcceptance.create({ data: { userId: user.id, documentId: doc.id } })
  }
  return user
}

beforeEach(async () => {
  await resetDatabase()
  for (const kind of ['WAIVER', 'HEALTH_ATTESTATION', 'ON_COURSE_DISCLAIMER'] as const) {
    await prisma.consentDocument.create({
      data: { kind, version: 1, required: true, body: 'DRAFT — PENDING ATTORNEY REVIEW' },
    })
  }
})

describe('capture API', () => {
  it('refuses to start a session for a user with outstanding consents', async () => {
    const user = await prisma.user.create({ data: { email: 'blocked@example.com' } })
    const res = await createSession(
      new Request('http://t/api/combine/session', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).missing).toContain('WAIVER')
  })

  it('starts a session for a consented user', async () => {
    const user = await makeConsentedUser('ok@example.com')
    const res = await createSession(
      new Request('http://t/api/combine/session', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).sessionId).toBeTruthy()
  })

  it('issues an upload URL and registers the clip', async () => {
    const user = await makeConsentedUser('up@example.com')
    const started = await (
      await createSession(
        new Request('http://t/api/combine/session', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        }),
      )
    ).json()

    const res = await createClip(
      new Request('http://t/api/combine/clip', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionId: started.sessionId,
          requirementId: 'driver_face_on',
          swingIndex: 0,
          handedness: 'LEFT',
          durationMs: 4100,
        }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.uploadUrl).toContain('memory://upload/')
  })

  it('reports remaining shots on the session', async () => {
    const user = await makeConsentedUser('rep@example.com')
    const started = await (
      await createSession(
        new Request('http://t/api/combine/session', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        }),
      )
    ).json()

    const res = await readSession(
      new Request(`http://t/api/combine/session?sessionId=${started.sessionId}`),
    )
    const body = await res.json()
    expect(body.completeness.complete).toBe(false)
    expect(body.completeness.totalCaptured).toBe(0)
    expect(body.completeness.totalRequired).toBe(24)
  })
})
