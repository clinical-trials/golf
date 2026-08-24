import { z } from 'zod'
import { payments } from '@/lib/payments'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { holdBooking, cancelBooking } from '@/domain/schedule/booking'

const postSchema = z.object({
  userId: z.string().min(1),
  proId: z.string().min(1),
  productId: z.string().min(1),
  startsAt: z.string().datetime(),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const input = parsed.data
  const missing = await missingRequiredConsents(input.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  try {
    const booking = await holdBooking({
      userId: input.userId,
      proId: input.proId,
      productId: input.productId,
      startsAt: new Date(input.startsAt),
      payments,
    })
    return Response.json({
      bookingId: booking.id,
      status: booking.status,
      paymentProvider: booking.paymentProvider,
      priceMinor: booking.priceMinor,
      currency: booking.currency,
    })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 })
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const bookingId = new URL(request.url).searchParams.get('bookingId')
  if (!bookingId) return Response.json({ error: 'bookingId is required' }, { status: 400 })

  const booking = await cancelBooking({ bookingId, payments })
  return Response.json({ bookingId: booking.id, status: booking.status })
}
