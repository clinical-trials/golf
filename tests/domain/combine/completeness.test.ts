import { describe, it, expect } from 'vitest'
import { COMBINE_PROTOCOL } from '@/domain/combine/protocol'
import { evaluateSessionCompleteness } from '@/domain/combine/completeness'

function allClips() {
  return COMBINE_PROTOCOL.flatMap((r) =>
    Array.from({ length: r.swings }, (_, i) => ({ requirementId: r.id, swingIndex: i })),
  )
}

describe('completeness', () => {
  it('reports an empty session as incomplete with everything missing', () => {
    const report = evaluateSessionCompleteness([])
    expect(report.complete).toBe(false)
    expect(report.totalCaptured).toBe(0)
    expect(report.missing).toHaveLength(COMBINE_PROTOCOL.length)
    expect(report.completeDomains).toEqual([])
  })

  it('reports a full session as complete', () => {
    const report = evaluateSessionCompleteness(allClips())
    expect(report.complete).toBe(true)
    expect(report.totalCaptured).toBe(report.totalRequired)
    expect(report.missing).toEqual([])
  })

  it('refuses to call a shot done with only two of three swings', () => {
    const clips = allClips().filter(
      (c) => !(c.requirementId === 'driver_face_on' && c.swingIndex === 2),
    )
    const report = evaluateSessionCompleteness(clips)
    expect(report.complete).toBe(false)
    expect(report.missing).toEqual([{ requirementId: 'driver_face_on', missingSwings: [2] }])
  })

  it('reports a domain complete when all of its shots are done', () => {
    const putting = COMBINE_PROTOCOL.filter((r) => r.domain === 'PUTTING')
    const clips = putting.flatMap((r) =>
      Array.from({ length: r.swings }, (_, i) => ({ requirementId: r.id, swingIndex: i })),
    )
    const report = evaluateSessionCompleteness(clips)
    expect(report.completeDomains).toEqual(['PUTTING'])
    expect(report.complete).toBe(false)
  })

  it('ignores clips for requirements that are not in the protocol', () => {
    const report = evaluateSessionCompleteness([
      ...allClips(),
      { requirementId: 'ghost_shot', swingIndex: 0 },
    ])
    expect(report.complete).toBe(true)
    expect(report.totalCaptured).toBe(report.totalRequired)
  })
})
