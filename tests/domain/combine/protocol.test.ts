import { describe, it, expect } from 'vitest'
import { COMBINE_PROTOCOL, getRequirement } from '@/domain/combine/protocol'

describe('combine protocol', () => {
  it('requires exactly three swings for every shot', () => {
    for (const req of COMBINE_PROTOCOL) {
      expect(req.swings, `${req.id} must require 3 swings`).toBe(3)
    }
  })

  it('covers all three skill domains', () => {
    const domains = new Set(COMBINE_PROTOCOL.map((r) => r.domain))
    expect([...domains].sort()).toEqual(['FULL_SWING', 'PUTTING', 'SHORT_GAME'])
  })

  it('captures driver and mid-iron from both angles', () => {
    for (const club of ['DRIVER', 'MID_IRON'] as const) {
      const angles = COMBINE_PROTOCOL.filter((r) => r.club === club).map((r) => r.angle).sort()
      expect(angles).toEqual(['DOWN_THE_LINE', 'FACE_ON'])
    }
  })

  it('uses unique ids', () => {
    const ids = COMBINE_PROTOCOL.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives non-empty guidance for every shot', () => {
    for (const req of COMBINE_PROTOCOL) {
      expect(req.guidance.length).toBeGreaterThan(10)
    }
  })

  it('looks a requirement up by id', () => {
    expect(getRequirement('driver_face_on')?.club).toBe('DRIVER')
    expect(getRequirement('nope')).toBeUndefined()
  })
})
