import { prisma } from '@/lib/db'
import type { AvailabilityException, AvailabilityRule } from '@prisma/client'

export interface WeeklyRuleInput {
  proId: string
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
}

export async function setWeeklyRule(input: WeeklyRuleInput): Promise<AvailabilityRule> {
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
    throw new Error(`weekday must be an integer from 0 to 6, received ${input.weekday}`)
  }
  if (input.endMinute <= input.startMinute) {
    throw new Error('end must be after start')
  }
  if (input.slotMinutes <= 0) {
    throw new Error('slotMinutes must be positive')
  }

  const { proId, weekday, ...rest } = input
  return prisma.availabilityRule.upsert({
    where: { proId_weekday: { proId, weekday } },
    update: rest,
    create: input,
  })
}

export async function addException(input: {
  proId: string
  date: Date
  blocked: boolean
}): Promise<AvailabilityException> {
  return prisma.availabilityException.upsert({
    where: { proId_date: { proId: input.proId, date: input.date } },
    update: { blocked: input.blocked },
    create: input,
  })
}

export async function listRules(proId: string): Promise<AvailabilityRule[]> {
  return prisma.availabilityRule.findMany({ where: { proId }, orderBy: { weekday: 'asc' } })
}

export async function listExceptions(
  proId: string,
  from: Date,
  to: Date,
): Promise<AvailabilityException[]> {
  return prisma.availabilityException.findMany({
    where: { proId, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })
}
