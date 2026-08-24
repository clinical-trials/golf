import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'
import { holdBooking, confirmBooking, cancelBooking } from '@/domain/schedule/booking'
import { resetDatabase } from '../../reset'

async function fixtures() {
  const proUser = await prisma.user.create({
    data: { email: `pro${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  const pro = await prisma.pro.create({
    data: { userId: proUser.id, displayName: 'Test Pro', timezone: 'UTC' },
  })
  const product = await prisma.lessonProduct.create({
    data: { proId: pro.id, name: 'One hour lesson', minutes: 60, priceMinor: 12000, currency: 'usd' },
  })
  const student = await prisma.user.create({
    data: { email: `s${Date.now()}${Math.round(performance.now())}@example.com` },
  })
  return { pro, product, student }
}

beforeEach(resetDatabase)

describe('booking', () => {
  it('holds a booking with a payment reference and no charge yet', async () => {
    const { pro, product, student } = await fixtures()
    const booking = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments: new StubPayments(),
    })

    expect(booking.status).toBe('HELD')
    expect(booking.paymentProvider).toBe('STUB')
    expect(booking.paymentReference).toMatch(/^stub_/)
    expect(booking.priceMinor).toBe(12000)
  })

  it('derives the end time from the product length', async () => {
    const { pro, product, student } = await fixtures()
    const booking = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments: new StubPayments(),
    })
    expect(booking.endsAt.toISOString()).toBe('2026-09-07T16:00:00.000Z')
  })

  it('refuses to double-book the same time', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const at = new Date('2026-09-07T15:00:00Z')
    await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })

    await expect(
      holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments }),
    ).rejects.toThrow(/already booked/i)
  })

  it('refuses a booking that overlaps an existing one', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments,
    })

    await expect(
      holdBooking({
        userId: student.id, proId: pro.id, productId: product.id,
        startsAt: new Date('2026-09-07T15:30:00Z'), payments,
      }),
    ).rejects.toThrow(/already booked/i)
  })

  it('confirms a held booking', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const held = await holdBooking({
      userId: student.id, proId: pro.id, productId: product.id,
      startsAt: new Date('2026-09-07T15:00:00Z'), payments,
    })

    const confirmed = await confirmBooking({ bookingId: held.id, payments })
    expect(confirmed.status).toBe('CONFIRMED')
  })

  it('cancels a booking and frees the slot', async () => {
    const { pro, product, student } = await fixtures()
    const payments = new StubPayments()
    const at = new Date('2026-09-07T15:00:00Z')
    const held = await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })

    const cancelled = await cancelBooking({ bookingId: held.id, payments })
    expect(cancelled.status).toBe('CANCELLED')

    const rebooked = await holdBooking({ userId: student.id, proId: pro.id, productId: product.id, startsAt: at, payments })
    expect(rebooked.status).toBe('HELD')
  })
})
