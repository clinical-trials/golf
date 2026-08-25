import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createPlayerProfile, getPlayerProfile, setDomainLevel } from '@/domain/player/profile'
import { resetDatabase } from '../../reset'

async function makeUser() {
  return prisma.user.create({
    data: { email: `p${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

beforeEach(resetDatabase)

describe('player profile', () => {
  it('creates a profile and reads it back', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'LEFT',
      ageBand: 'SENIOR_55_69',
      practiceAccess: 'HOME_NET',
      primaryGoal: 'BREAK_90',
      language: 'en',
    })

    const profile = await getPlayerProfile(user.id)
    expect(profile?.handedness).toBe('LEFT')
    expect(profile?.practiceAccess).toBe('HOME_NET')
  })

  it('starts every skill domain unassessed', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'RIGHT',
      ageBand: 'ADULT_30_54',
      practiceAccess: 'FULL_FACILITY',
      primaryGoal: 'BREAK_80',
      language: 'en',
    })

    const profile = await getPlayerProfile(user.id)
    expect(profile?.fullSwingLevel).toBeNull()
    expect(profile?.shortGameLevel).toBeNull()
    expect(profile?.puttingLevel).toBeNull()
  })

  it('rejects a second profile for the same user', async () => {
    const user = await makeUser()
    const input = {
      userId: user.id,
      handedness: 'RIGHT' as const,
      ageBand: 'ADULT_30_54' as const,
      practiceAccess: 'RANGE' as const,
      primaryGoal: 'ENJOYMENT' as const,
      language: 'en',
    }
    await createPlayerProfile(input)
    await expect(createPlayerProfile(input)).rejects.toThrow()
  })

  it('records a per-domain level and confidence separately', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'RIGHT',
      ageBand: 'ADULT_30_54',
      practiceAccess: 'RANGE',
      primaryGoal: 'BREAK_90',
      language: 'en',
    })

    await setDomainLevel(user.id, 'FULL_SWING', { level: 12, confidence: 0.7 })
    await setDomainLevel(user.id, 'SHORT_GAME', { level: 25, confidence: 0.55 })

    const profile = await getPlayerProfile(user.id)
    expect(profile?.fullSwingLevel).toBe(12)
    expect(profile?.fullSwingConfidence).toBeCloseTo(0.7)
    expect(profile?.shortGameLevel).toBe(25)
    expect(profile?.puttingLevel).toBeNull()
  })

  it('rejects a level outside the handicap band', async () => {
    const user = await makeUser()
    await createPlayerProfile({
      userId: user.id,
      handedness: 'RIGHT',
      ageBand: 'ADULT_30_54',
      practiceAccess: 'RANGE',
      primaryGoal: 'BREAK_90',
      language: 'en',
    })
    await expect(
      setDomainLevel(user.id, 'PUTTING', { level: 80, confidence: 0.5 }),
    ).rejects.toThrow(/level/i)
  })
})
