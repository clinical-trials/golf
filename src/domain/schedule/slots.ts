export interface RuleShape {
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
}

export interface ExceptionShape {
  date: Date
  blocked: boolean
}

export interface Slot {
  startsAt: Date
  endsAt: Date
}

export interface DeriveSlotsInput {
  rules: RuleShape[]
  exceptions: ExceptionShape[]
  taken: { startsAt: Date; endsAt: Date }[]
  from: Date
  to: Date
  timezoneOffsetMinutes: number
}

const DAY_MS = 24 * 60 * 60 * 1000

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

const overlaps = (a: Slot, b: { startsAt: Date; endsAt: Date }) =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt

export function deriveSlots(input: DeriveSlotsInput): Slot[] {
  const blocked = new Set(
    input.exceptions.filter((e) => e.blocked).map((e) => dayKey(e.date)),
  )

  const slots: Slot[] = []
  const firstDay = new Date(Date.UTC(
    input.from.getUTCFullYear(), input.from.getUTCMonth(), input.from.getUTCDate(),
  ))

  for (let cursor = firstDay.getTime(); cursor < input.to.getTime(); cursor += DAY_MS) {
    const day = new Date(cursor)
    if (blocked.has(dayKey(day))) continue

    for (const rule of input.rules) {
      if (rule.weekday !== day.getUTCDay()) continue

      for (let m = rule.startMinute; m + rule.slotMinutes <= rule.endMinute; m += rule.slotMinutes) {
        const startsAt = new Date(cursor + (m - input.timezoneOffsetMinutes) * 60_000)
        const endsAt = new Date(startsAt.getTime() + rule.slotMinutes * 60_000)

        if (startsAt < input.from || endsAt > input.to) continue
        if (input.taken.some((t) => overlaps({ startsAt, endsAt }, t))) continue

        slots.push({ startsAt, endsAt })
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}
