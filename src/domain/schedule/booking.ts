import { prisma } from '@/lib/db'
import type { Booking } from '@prisma/client'
import type { PaymentPort } from '@/domain/payments/port'

export interface HoldBookingInput {
  userId: string
  proId: string
  productId: string
  startsAt: Date
  payments: PaymentPort
}

export async function holdBooking(input: HoldBookingInput): Promise<Booking> {
  const product = await prisma.lessonProduct.findUniqueOrThrow({ where: { id: input.productId } })
  const endsAt = new Date(input.startsAt.getTime() + product.minutes * 60_000)

  const clash = await prisma.booking.findFirst({
    where: {
      proId: input.proId,
      status: { in: ['HELD', 'CONFIRMED'] },
      startsAt: { lt: endsAt },
      endsAt: { gt: input.startsAt },
    },
  })
  if (clash) throw new Error('That time is already booked')

  const intent = await input.payments.createIntent({
    amountMinor: product.priceMinor,
    currency: product.currency,
    description: product.name,
    metadata: { proId: input.proId, productId: product.id },
  })

  return prisma.booking.create({
    data: {
      userId: input.userId,
      proId: input.proId,
      productId: product.id,
      startsAt: input.startsAt,
      endsAt,
      priceMinor: product.priceMinor,
      currency: product.currency,
      paymentProvider: intent.provider,
      paymentReference: intent.reference,
    },
  })
}

export async function confirmBooking(input: {
  bookingId: string
  payments: PaymentPort
}): Promise<Booking> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } })
  if (booking.status !== 'HELD') throw new Error(`Cannot confirm a booking that is ${booking.status}`)

  const outcome = await input.payments.capture(booking.paymentReference)
  if (outcome.status !== 'SUCCEEDED') throw new Error(`Payment did not succeed: ${outcome.message}`)

  return prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } })
}

export async function cancelBooking(input: {
  bookingId: string
  payments: PaymentPort
}): Promise<Booking> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } })
  if (booking.status === 'CANCELLED') return booking

  if (booking.status === 'CONFIRMED') {
    await input.payments.refund(booking.paymentReference)
  }

  return prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
}
