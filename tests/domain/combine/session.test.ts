import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { startSession, registerClip, getSessionWithClips } from '@/domain/combine/session'
import { resetDatabase } from '../../reset'

async function makeUser() {
  return prisma.user.create({
    data: { email: `c${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

beforeEach(resetDatabase)

describe('capture session', () => {
  it('starts an open session', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    expect(session.status).toBe('OPEN')
    expect(session.userId).toBe(user.id)
  })

  it('registers a clip against a requirement', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    const clip = await registerClip({
      sessionId: session.id,
      requirementId: 'driver_face_on',
      swingIndex: 0,
      storageKey: 'clips/x.mp4',
      handedness: 'LEFT',
      durationMs: 4200,
    })
    expect(clip.requirementId).toBe('driver_face_on')
    expect(clip.handedness).toBe('LEFT')
  })

  it('rejects an unknown requirement id', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    await expect(
      registerClip({
        sessionId: session.id,
        requirementId: 'not_a_shot',
        swingIndex: 0,
        storageKey: 'clips/y.mp4',
        handedness: 'RIGHT',
        durationMs: 4200,
      }),
    ).rejects.toThrow(/unknown requirement/i)
  })

  it('rejects a swing index outside the required count', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    await expect(
      registerClip({
        sessionId: session.id,
        requirementId: 'driver_face_on',
        swingIndex: 3,
        storageKey: 'clips/z.mp4',
        handedness: 'RIGHT',
        durationMs: 4200,
      }),
    ).rejects.toThrow(/swing index/i)
  })

  it('replaces a re-uploaded swing rather than duplicating it', async () => {
    const user = await makeUser()
    const session = await startSession(user.id)
    const base = {
      sessionId: session.id,
      requirementId: 'driver_face_on',
      swingIndex: 0,
      handedness: 'RIGHT' as const,
      durationMs: 4200,
    }
    await registerClip({ ...base, storageKey: 'clips/first.mp4' })
    await registerClip({ ...base, storageKey: 'clips/second.mp4' })

    const loaded = await getSessionWithClips(session.id)
    expect(loaded?.clips).toHaveLength(1)
    expect(loaded?.clips[0]?.storageKey).toBe('clips/second.mp4')
  })
})
