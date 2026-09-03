import { z } from 'zod'
import { payments } from '@/lib/payments'
import { missingRequiredConsents } from '@/domain/consent/gate'
import { enroll, confirmEnrollment, submitWeek } from '@/domain/program/enrollment'

const enrollSchema = z.object({
  userId: z.string().min(1),
  programSlug: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const parsed = enrollSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  const missing = await missingRequiredConsents(parsed.data.userId)
  if (missing.length > 0) return Response.json({ error: 'consent required', missing }, { status: 403 })

  try {
    const { enrollment, clientSecret } = await enroll({
      userId: parsed.data.userId,
      programSlug: parsed.data.programSlug,
      payments,
    })
    return Response.json({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      paymentProvider: enrollment.paymentProvider,
      // Stripe Elements/Checkout confirms the card with this; null on the stub.
      clientSecret,
    })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 })
  }
}

const confirmSchema = z.object({ enrollmentId: z.string().min(1) })

export async function PUT(request: Request): Promise<Response> {
  const parsed = confirmSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  try {
    const enrollment = await confirmEnrollment({ enrollmentId: parsed.data.enrollmentId, payments })
    return Response.json({ enrollmentId: enrollment.id, status: enrollment.status })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 })
  }
}

const weekSchema = z.object({
  enrollmentId: z.string().min(1),
  week: z.number().int().min(1).max(12),
  homeworkDone: z.boolean(),
  quizAnswers: z.array(z.number().int().min(0)),
})

export async function PATCH(request: Request): Promise<Response> {
  const parsed = weekSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })

  try {
    return Response.json(await submitWeek(parsed.data))
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
}
