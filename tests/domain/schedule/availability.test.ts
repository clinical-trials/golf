import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { setWeeklyRule, addException, listRules, listExceptions } from '@/domain/schedule/availability'
import { resetDatabase } from '../../reset'

async function makePro() {
  const user = await prisma.user.create({
    data: { email: `pro${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  return prisma.pro.create({
    data: { userId: user.id, displayName: 'Test Pro', timezone: 'America/Denver' },
  })
}

beforeEach(resetDatabase)

describe('availability', () => {
  it('stores a weekly rule', async () => {
    const pro = await makePro()
    const rule = await setWeeklyRule({
      proId: pro.id, weekday: 2, startMinute: 540, endMinute: 780, slotMinutes: 60,
    })
    expect(rule.weekday).toBe(2)
    expect(rule.startMinute).toBe(540)
  })

  it('replaces a rule for the same weekday rather than duplicating it', async () => {
    const pro = await makePro()
    await setWeeklyRule({ proId: pro.id, weekday: 2, startMinute: 540, endMinute: 780, slotMinutes: 60 })
    await setWeeklyRule({ proId: pro.id, weekday: 2, startMinute: 600, endMinute: 840, slotMinutes: 45 })

    const rules = await listRules(pro.id)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.startMinute).toBe(600)
    expect(rules[0]?.slotMinutes).toBe(45)
  })

  it('rejects an end before a start', async () => {
    const pro = await makePro()
    await expect(
      setWeeklyRule({ proId: pro.id, weekday: 1, startMinute: 780, endMinute: 540, slotMinutes: 60 }),
    ).rejects.toThrow(/end/i)
  })

  it('rejects a weekday outside 0 to 6', async () => {
    const pro = await makePro()
    await expect(
      setWeeklyRule({ proId: pro.id, weekday: 7, startMinute: 540, endMinute: 780, slotMinutes: 60 }),
    ).rejects.toThrow(/weekday/i)
  })

  it('records a blocked day and finds it in range', async () => {
    const pro = await makePro()
    await addException({ proId: pro.id, date: new Date('2026-09-03T00:00:00Z'), blocked: true })

    const found = await listExceptions(pro.id, new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'))
    expect(found).toHaveLength(1)
    expect(found[0]?.blocked).toBe(true)
  })
})
