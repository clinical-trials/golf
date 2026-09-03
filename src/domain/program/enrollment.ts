import { prisma } from '@/lib/db'
import type { Enrollment, Program, ProgramWeek } from '@prisma/client'
import type { PaymentPort } from '@/domain/payments/port'
import { ALL_PROGRAMS, type ProgramSpec, type QuizQuestion } from './curriculum'

/** Idempotent: upserts programs and replaces their weeks. */
export async function seedPrograms(specs: ProgramSpec[] = ALL_PROGRAMS): Promise<number> {
  for (const spec of specs) {
    const program = await prisma.program.upsert({
      where: { slug: spec.slug },
      update: {
        name: spec.name,
        description: spec.description,
        weeks: spec.weeks.length,
        priceMinor: spec.priceMinor,
        currency: spec.currency,
      },
      create: {
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        weeks: spec.weeks.length,
        priceMinor: spec.priceMinor,
        currency: spec.currency,
      },
    })
    await prisma.programWeek.deleteMany({ where: { programId: program.id } })
    for (const week of spec.weeks) {
      await prisma.programWeek.create({
        data: {
          programId: program.id,
          week: week.week,
          title: week.title,
          videoId: week.videoId,
          homework: week.homework,
          quiz: week.quiz as unknown as object,
        },
      })
    }
  }
  return specs.length
}

export async function listPrograms(): Promise<(Program & { weeksContent: ProgramWeek[] })[]> {
  return prisma.program.findMany({
    include: { weeksContent: { orderBy: { week: 'asc' } } },
    orderBy: { slug: 'asc' },
  })
}

export interface EnrollResult {
  enrollment: Enrollment
  clientSecret: string | null
}

/** Same Stripe PaymentIntent flow as bookings: hold with an intent, capture on confirm. */
export async function enroll(input: {
  userId: string
  programSlug: string
  payments: PaymentPort
}): Promise<EnrollResult> {
  const program = await prisma.program.findUniqueOrThrow({ where: { slug: input.programSlug } })

  const existing = await prisma.enrollment.findUnique({
    where: { userId_programId: { userId: input.userId, programId: program.id } },
  })
  if (existing && existing.status !== 'CANCELLED') {
    throw new Error('Already enrolled in this program')
  }

  const intent = await input.payments.createIntent({
    amountMinor: program.priceMinor,
    currency: program.currency,
    description: program.name,
    metadata: { programSlug: program.slug },
  })

  const data = {
    status: 'HELD' as const,
    paymentProvider: intent.provider,
    paymentReference: intent.reference,
  }
  const enrollment = existing
    ? await prisma.enrollment.update({ where: { id: existing.id }, data })
    : await prisma.enrollment.create({ data: { userId: input.userId, programId: program.id, ...data } })

  return { enrollment, clientSecret: intent.clientSecret }
}

export async function confirmEnrollment(input: {
  enrollmentId: string
  payments: PaymentPort
}): Promise<Enrollment> {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: input.enrollmentId } })
  if (enrollment.status !== 'HELD') {
    throw new Error(`Cannot confirm an enrollment that is ${enrollment.status}`)
  }
  const outcome = await input.payments.capture(enrollment.paymentReference)
  if (outcome.status !== 'SUCCEEDED') throw new Error(`Payment did not succeed: ${outcome.message}`)
  return prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: 'ACTIVE' } })
}

export interface QuizResult {
  score: number
  total: number
  feedback: { question: string; correct: boolean; explain: string }[]
}

/** Low-stakes by design: never pass/fail, always explanatory feedback. */
export function scoreQuiz(quiz: QuizQuestion[], answers: number[]): QuizResult {
  if (answers.length !== quiz.length) {
    throw new Error(`Expected ${quiz.length} answers, received ${answers.length}`)
  }
  const feedback = quiz.map((question, i) => ({
    question: question.q,
    correct: answers[i] === question.answer,
    explain: question.explain,
  }))
  return { score: feedback.filter((f) => f.correct).length, total: quiz.length, feedback }
}

export async function submitWeek(input: {
  enrollmentId: string
  week: number
  homeworkDone: boolean
  quizAnswers: number[]
}): Promise<{ progress: { week: number; quizScore: number | null }; quiz: QuizResult }> {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: input.enrollmentId },
    include: { program: { include: { weeksContent: true } } },
  })
  if (enrollment.status !== 'ACTIVE') {
    throw new Error(`Enrollment is ${enrollment.status}; only ACTIVE enrollments submit work`)
  }
  const weekContent = enrollment.program.weeksContent.find((w) => w.week === input.week)
  if (!weekContent) throw new Error(`Program has no week ${input.week}`)

  const quiz = scoreQuiz(weekContent.quiz as unknown as QuizQuestion[], input.quizAnswers)

  const progress = await prisma.weekProgress.upsert({
    where: { enrollmentId_week: { enrollmentId: enrollment.id, week: input.week } },
    update: { homeworkDone: input.homeworkDone, quizScore: quiz.score, quizTotal: quiz.total, completedAt: new Date() },
    create: {
      enrollmentId: enrollment.id,
      week: input.week,
      homeworkDone: input.homeworkDone,
      quizScore: quiz.score,
      quizTotal: quiz.total,
      completedAt: new Date(),
    },
  })

  // Completing the final week completes the program.
  const done = await prisma.weekProgress.count({ where: { enrollmentId: enrollment.id, completedAt: { not: null } } })
  if (done >= enrollment.program.weeks) {
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: 'COMPLETED' } })
  }

  return { progress: { week: progress.week, quizScore: progress.quizScore }, quiz }
}
