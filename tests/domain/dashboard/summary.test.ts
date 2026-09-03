import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { StubPayments } from '@/domain/payments/stub'
import { seedPrograms, enroll, confirmEnrollment } from '@/domain/program/enrollment'
import { buildDashboardSummary } from '@/domain/dashboard/summary'
import { resetDatabase } from '../../reset'

let seq = 0
const uniq = () => `${Date.now()}${seq++}`

async function makeUser(email = `d${uniq()}@example.com`) {
  return prisma.user.create({ data: { email } })
}

async function makeCourse(name = 'Lions Municipal', par = 4) {
  const id = uniq()
  const course = await prisma.course.create({
    data: {
      sourceId: `src_${id}`,
      slug: `course-${id}`,
      name,
      country: 'US',
      place: 'Austin, TX',
      latitude: 30.29,
      longitude: -97.79,
      coverage: 'DETAILED',
    },
  })
  for (let n = 1; n <= 9; n++) {
    await prisma.hole.create({
      data: { courseId: course.id, number: n, par, lengthMeters: 350, strokeIndex: n, path: [] },
    })
  }
  return course
}

async function makeRound(
  userId: string,
  courseId: string,
  playedOn: Date,
  perHole: { strokes: number; putts: number; penalties?: number },
) {
  const round = await prisma.round.create({ data: { userId, courseId, playedOn } })
  const holes = await prisma.hole.findMany({ where: { courseId }, orderBy: { number: 'asc' } })
  for (const hole of holes) {
    await prisma.holeScore.create({
      data: {
        roundId: round.id,
        holeId: hole.id,
        holeNumber: hole.number,
        strokes: perHole.strokes,
        putts: perHole.putts,
        fairwayHit: true,
        greenInRegulation: false,
        penalties: perHole.penalties ?? 0,
      },
    })
  }
  return round
}

async function makeBooking(userId: string, startsAt: Date, status: 'HELD' | 'CONFIRMED' | 'CANCELLED') {
  const proUser = await makeUser(`pro${uniq()}@example.com`)
  const pro = await prisma.pro.create({ data: { userId: proUser.id, displayName: 'Tom Harris' } })
  const product = await prisma.lessonProduct.create({
    data: { proId: pro.id, name: 'Private lesson with Tom', minutes: 60, priceMinor: 12000 },
  })
  return prisma.booking.create({
    data: {
      userId,
      proId: pro.id,
      productId: product.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      status,
      priceMinor: 12000,
      currency: 'usd',
      paymentProvider: 'STUB',
      paymentReference: `stub_${uniq()}`,
    },
  })
}

beforeEach(async () => {
  await prisma.weekProgress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.programWeek.deleteMany()
  await prisma.program.deleteMany()
  await resetDatabase()
})

describe('dashboard summary', () => {
  it('is empty and honest for a brand-new student', async () => {
    const user = await makeUser()
    const summary = await buildDashboardSummary(user.id)
    expect(summary.student.email).toBe(user.email)
    expect(summary.programs).toEqual([])
    expect(summary.recentRounds).toEqual([])
    expect(summary.upcoming).toEqual([])
    expect(summary.putting).toBeNull()
  })

  it('reports program progress and the next week up', async () => {
    await seedPrograms()
    const user = await makeUser()
    const payments = new StubPayments()
    const { enrollment } = await enroll({ userId: user.id, programSlug: 'score-better-6', payments })
    await confirmEnrollment({ enrollmentId: enrollment.id, payments })

    // Complete week 1 only.
    await prisma.weekProgress.create({
      data: { enrollmentId: enrollment.id, week: 1, homeworkDone: true, completedAt: new Date() },
    })

    const program = await prisma.program.findUniqueOrThrow({
      where: { slug: 'score-better-6' },
      include: { weeksContent: { orderBy: { week: 'asc' } } },
    })

    const summary = await buildDashboardSummary(user.id)
    expect(summary.programs).toHaveLength(1)
    const p = summary.programs[0]
    expect(p.slug).toBe('score-better-6')
    expect(p.status).toBe('ACTIVE')
    expect(p.weeksTotal).toBe(6)
    expect(p.weeksComplete).toBe(1)
    expect(p.percent).toBe(17)
    expect(p.nextUp).toBe(program.weeksContent[1].title)
  })

  it('summarises rounds with vs-par and a putting trend', async () => {
    const user = await makeUser()
    const course = await makeCourse() // 9 holes, par 4 → par 36

    // Earlier, worse round: 18 putts. Later, better round: 9 putts.
    await makeRound(user.id, course.id, new Date('2026-08-09'), { strokes: 5, putts: 2, penalties: 1 })
    await makeRound(user.id, course.id, new Date('2026-08-30'), { strokes: 5, putts: 1 })

    const summary = await buildDashboardSummary(user.id)

    expect(summary.recentRounds).toHaveLength(2)
    // Most recent first.
    expect(summary.recentRounds[0].playedOn.startsWith('2026-08-30')).toBe(true)
    const latest = summary.recentRounds[0]
    expect(latest.holes).toBe(9)
    expect(latest.strokes).toBe(45)
    expect(latest.putts).toBe(9)
    expect(latest.parTotal).toBe(36)
    expect(latest.vsPar).toBe(9)
    expect(summary.recentRounds[1].penalties).toBe(9)

    expect(summary.putting).not.toBeNull()
    expect(summary.putting!.rounds).toBe(2)
    expect(summary.putting!.firstRoundPutts).toBe(18)
    expect(summary.putting!.latestRoundPutts).toBe(9)
    expect(summary.putting!.delta).toBe(-9)
  })

  it('leaves vs-par null when a played hole has no par on record', async () => {
    const user = await makeUser()
    const course = await makeCourse()
    await prisma.hole.updateMany({ where: { courseId: course.id, number: 3 }, data: { par: null } })
    await makeRound(user.id, course.id, new Date('2026-08-30'), { strokes: 5, putts: 2 })

    const summary = await buildDashboardSummary(user.id)
    expect(summary.recentRounds[0].parTotal).toBeNull()
    expect(summary.recentRounds[0].vsPar).toBeNull()
  })

  it('lists only upcoming, non-cancelled bookings', async () => {
    const user = await makeUser()
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    await makeBooking(user.id, future, 'CONFIRMED')
    await makeBooking(user.id, past, 'CONFIRMED')
    await makeBooking(user.id, new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'CANCELLED')

    const summary = await buildDashboardSummary(user.id)
    expect(summary.upcoming).toHaveLength(1)
    expect(summary.upcoming[0].productName).toBe('Private lesson with Tom')
    expect(summary.upcoming[0].status).toBe('CONFIRMED')
  })
})
