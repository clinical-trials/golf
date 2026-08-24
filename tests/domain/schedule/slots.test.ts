import { describe, it, expect } from 'vitest'
import { deriveSlots } from '@/domain/schedule/slots'

const MONDAY_RULE = { weekday: 1, startMinute: 540, endMinute: 720, slotMinutes: 60 }

// Monday 2026-09-07 through Wednesday 2026-09-09, UTC for simplicity.
const from = new Date('2026-09-07T00:00:00Z')
const to = new Date('2026-09-09T00:00:00Z')

describe('deriveSlots', () => {
  it('produces one slot per interval inside the rule', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(3)
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T09:00:00.000Z')
    expect(slots[2]?.endsAt.toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })

  it('produces nothing for a weekday with no rule', () => {
    const slots = deriveSlots({
      rules: [{ ...MONDAY_RULE, weekday: 4 }], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(0)
  })

  it('drops every slot on a blocked day', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [{ date: new Date('2026-09-07T00:00:00Z'), blocked: true }],
      taken: [], from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(0)
  })

  it('drops a slot that overlaps an existing booking', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [{ startsAt: new Date('2026-09-07T10:00:00Z'), endsAt: new Date('2026-09-07T11:00:00Z') }],
      from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual([
      '2026-09-07T09:00:00.000Z',
      '2026-09-07T11:00:00.000Z',
    ])
  })

  it('drops a slot that only partially overlaps a booking', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [{ startsAt: new Date('2026-09-07T10:30:00Z'), endsAt: new Date('2026-09-07T10:45:00Z') }],
      from, to, timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(2)
  })

  it('shifts slot times by the pro timezone offset', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE], exceptions: [], taken: [], from, to, timezoneOffsetMinutes: -360,
    })
    // 09:00 local at UTC-6 is 15:00 UTC.
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T15:00:00.000Z')
  })

  it('never returns a slot outside the requested window', () => {
    const slots = deriveSlots({
      rules: [MONDAY_RULE],
      exceptions: [],
      taken: [],
      from: new Date('2026-09-07T10:00:00Z'),
      to: new Date('2026-09-07T11:00:00Z'),
      timezoneOffsetMinutes: 0,
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-09-07T10:00:00.000Z')
  })
})
