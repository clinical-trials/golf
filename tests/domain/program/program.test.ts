import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'
import { ALL_PROGRAMS, EIGHT_WEEK, SIX_WEEK, WOMENS_SIX_WEEK, FAMILY_SIX_WEEK, FIRST_90_DAYS, PUTTING_FOUR_WEEK, PRACTICE_FOUR_WEEK, EQUIPMENT_BASICS } from '@/domain/program/curriculum'
import { seedPrograms, listPrograms, enroll, confirmEnrollment, scoreQuiz, submitWeek } from '@/domain/program/enrollment'
import { resetDatabase } from '../../reset'

async function makeUser() {
  return prisma.user.create({
    data: { email: `e${Date.now()}${Math.round(performance.now())}@example.com` },
  })
}

beforeEach(async () => {
  await prisma.weekProgress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.programWeek.deleteMany()
  await prisma.program.deleteMany()
  await resetDatabase()
})

describe('curriculum', () => {
  it('ships eight programs across the named segments', () => {
    expect(ALL_PROGRAMS).toHaveLength(8)
    expect(EIGHT_WEEK.weeks).toHaveLength(8)
    expect(SIX_WEEK.weeks).toHaveLength(6)
    expect(WOMENS_SIX_WEEK.weeks).toHaveLength(6)
    expect(FAMILY_SIX_WEEK.weeks).toHaveLength(6)
    expect(FIRST_90_DAYS.weeks).toHaveLength(12)
    expect(PUTTING_FOUR_WEEK.weeks).toHaveLength(4)
    expect(PRACTICE_FOUR_WEEK.weeks).toHaveLength(4)
    expect(EQUIPMENT_BASICS.weeks).toHaveLength(1)
  })

  it('every week has homework and a quiz whose answers are in range', () => {
    for (const program of ALL_PROGRAMS) {
      for (const week of program.weeks) {
        expect(week.homework.length).toBeGreaterThan(20)
        expect(week.quiz.length).toBeGreaterThanOrEqual(3)
        for (const question of week.quiz) {
          expect(question.answer).toBeGreaterThanOrEqual(0)
          expect(question.answer).toBeLessThan(question.options.length)
          expect(question.explain.length).toBeGreaterThan(10)
        }
      }
    }
  })

  it('is labeled draft pending Tom\'s review', () => {
    for (const program of ALL_PROGRAMS) {
      expect(program.description).toMatch(/draft curriculum pending tom harris review/i)
    }
  })
})

describe('enrollment', () => {
  it('seeds idempotently and lists with weeks', async () => {
    await seedPrograms()
    await seedPrograms()
    const programs = await listPrograms()
    expect(programs).toHaveLength(8)
    expect(programs.find((p) => p.slug === 'build-your-swing-8')?.weeksContent).toHaveLength(8)
  })

  it('enrolls via the payment port and activates on confirm', async () => {
    await seedPrograms()
    const user = await makeUser()
    const payments = new StubPayments()

    const { enrollment, clientSecret } = await enroll({ userId: user.id, programSlug: 'score-better-6', payments })
    expect(enrollment.status).toBe('HELD')
    expect(enrollment.paymentReference).toMatch(/^stub_/)
    expect(clientSecret).toBeNull()

    const active = await confirmEnrollment({ enrollmentId: enrollment.id, payments })
    expect(active.status).toBe('ACTIVE')
  })

  it('blocks double enrollment', async () => {
    await seedPrograms()
    const user = await makeUser()
    const payments = new StubPayments()
    await enroll({ userId: user.id, programSlug: 'score-better-6', payments })
    await expect(enroll({ userId: user.id, programSlug: 'score-better-6', payments })).rejects.toThrow(/already/i)
  })

  it('scores a quiz low-stakes: feedback for every answer, right or wrong', () => {
    const quiz = SIX_WEEK.weeks[0]!.quiz
    const wrong = quiz.map(() => 99)
    const result = scoreQuiz(quiz, wrong as number[])
    expect(result.score).toBe(0)
    expect(result.feedback).toHaveLength(quiz.length)
    expect(result.feedback[0]?.explain.length).toBeGreaterThan(10)

    const right = quiz.map((question) => question.answer)
    expect(scoreQuiz(quiz, right).score).toBe(quiz.length)
  })

  it('submits a week and completes the program when the last week lands', async () => {
    await seedPrograms()
    const user = await makeUser()
    const payments = new StubPayments()
    const { enrollment } = await enroll({ userId: user.id, programSlug: 'score-better-6', payments })
    await confirmEnrollment({ enrollmentId: enrollment.id, payments })

    const program = SIX_WEEK
    for (const week of program.weeks) {
      const result = await submitWeek({
        enrollmentId: enrollment.id,
        week: week.week,
        homeworkDone: true,
        quizAnswers: week.quiz.map((question) => question.answer),
      })
      expect(result.quiz.score).toBe(week.quiz.length)
    }

    const finished = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })
    expect(finished.status).toBe('COMPLETED')
  })

  it('refuses submissions on an unconfirmed enrollment', async () => {
    await seedPrograms()
    const user = await makeUser()
    const { enrollment } = await enroll({ userId: user.id, programSlug: 'score-better-6', payments: new StubPayments() })
    await expect(
      submitWeek({ enrollmentId: enrollment.id, week: 1, homeworkDone: true, quizAnswers: [0, 0, 0] }),
    ).rejects.toThrow(/HELD/)
  })
})
