import { z } from 'zod'
import { payments } from '@/lib/payments'
import { confirmBooking } from '@/domain/schedule/booking'

const postSchema = z.object({ bookingId: z.string().min(1) })

/**
 * Captures the payment for a held booking and confirms it.
 * With Stripe, the client first confirms the card using the clientSecret from
 * the hold response; this endpoint then captures the authorised intent.
 * On the stub, capture succeeds and no money moves.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  try {
    const booking = await confirmBooking({ bookingId: parsed.data.bookingId, payments })
    return Response.json({ bookingId: booking.id, status: booking.status })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 })
  }
}
