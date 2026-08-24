import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'
import { resetDatabase } from '../../reset'

vi.mock('@/lib/payments', () => ({ payments: new StubPayments() }))

const { GET: getSchedule } = await import('@/app/api/schedule/route')
const { POST: postBooking } = await import('@/app/api/bookings/route')
const { POST: postConfirm } = await import('@/app/api/bookings/confirm/route')

async function consented(email: string) {
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

describe('scheduling API', () => {
  it('lists free slots for a pro', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p1@example.com' } })
    const pro = await prisma.pro.create({
      data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' },
    })
    await prisma.availabilityRule.create({
      data: { proId: pro.id, weekday: 1, startMinute: 540, endMinute: 720, slotMinutes: 60 },
    })

    const res = await getSchedule(
      new Request(`http://t/api/schedule?proId=${pro.id}&from=2026-09-07T00:00:00Z&to=2026-09-09T00:00:00Z`),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.slots).toHaveLength(3)
  })

  it('refuses a booking from a user with outstanding consents', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p2@example.com' } })
    const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' } })
    const product = await prisma.lessonProduct.create({
      data: { proId: pro.id, name: 'Lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
    })
    const blocked = await prisma.user.create({ data: { email: 'blocked2@example.com' } })

    const res = await postBooking(
      new Request('http://t/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          userId: blocked.id, proId: pro.id, productId: product.id, startsAt: '2026-09-07T15:00:00Z',
        }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('books for a consented user and reports the stub provider', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p3@example.com' } })
    const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' } })
    const product = await prisma.lessonProduct.create({
      data: { proId: pro.id, name: 'Lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
    })
    const student = await consented('ok3@example.com')

    const res = await postBooking(
      new Request('http://t/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          userId: student.id, proId: pro.id, productId: product.id, startsAt: '2026-09-07T15:00:00Z',
        }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.paymentProvider).toBe('STUB')
    expect(body.status).toBe('HELD')
    expect(body.clientSecret).toBeNull()
  })

  it('confirms a held booking through the confirm endpoint', async () => {
    const proUser = await prisma.user.create({ data: { email: 'p4@example.com' } })
    const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'P', timezone: 'UTC' } })
    const product = await prisma.lessonProduct.create({
      data: { proId: pro.id, name: 'Lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
    })
    const student = await consented('ok4@example.com')

    const held = await (
      await postBooking(
        new Request('http://t/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            userId: student.id, proId: pro.id, productId: product.id, startsAt: '2026-09-08T15:00:00Z',
          }),
        }),
      )
    ).json()

    const res = await postConfirm(
      new Request('http://t/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({ bookingId: held.bookingId }),
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('CONFIRMED')
  })

  it('rejects confirming an unknown booking', async () => {
    const res = await postConfirm(
      new Request('http://t/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'nope' }),
      }),
    )
    expect(res.status).toBe(409)
  })
})
