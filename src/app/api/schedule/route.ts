import { prisma } from '@/lib/db'
import { deriveSlots } from '@/domain/schedule/slots'
import { listRules, listExceptions } from '@/domain/schedule/availability'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const proId = params.get('proId')
  const from = params.get('from')
  const to = params.get('to')
  if (!proId || !from || !to) {
    return Response.json({ error: 'proId, from and to are required' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return Response.json({ error: 'from and to must be ISO timestamps' }, { status: 400 })
  }

  const pro = await prisma.pro.findUnique({ where: { id: proId } })
  if (!pro) return Response.json({ error: 'pro not found' }, { status: 404 })

  const [rules, exceptions, taken] = await Promise.all([
    listRules(proId),
    listExceptions(proId, fromDate, toDate),
    prisma.booking.findMany({
      where: { proId, status: { in: ['HELD', 'CONFIRMED'] }, startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  const slots = deriveSlots({
    rules, exceptions, taken, from: fromDate, to: toDate, timezoneOffsetMinutes: 0,
  })

  return Response.json({ slots })
}
