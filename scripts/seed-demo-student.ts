/**
 * Seeds one demo student with real rows — an enrollment with week progress,
 * two logged rounds, and an upcoming booking — so the student dashboard can be
 * exercised end-to-end locally before real email login exists. Idempotent:
 * re-running refreshes the same demo user (demo@pocketpro.test).
 *
 *   DATABASE_URL=... pnpm exec tsx scripts/seed-demo-student.ts
 *
 * Then, with the dev server running and DEV_AUTH=1, issue a session:
 *   curl -s localhost:3000/api/auth/session -d '{"email":"demo@pocketpro.test"}'
 * and open the dashboard with pp_api / pp_session set in localStorage.
 */
import 'dotenv/config'
import { prisma } from '@/lib/db'
import { seedPrograms, enroll, confirmEnrollment } from '@/domain/program/enrollment'
import { StubPayments } from '@/domain/payments/stub'

const EMAIL = 'demo@pocketpro.test'

async function main() {
  await seedPrograms()

  // Fresh demo user each run.
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } })
  if (existing) {
    await prisma.session.deleteMany({ where: { userId: existing.id } })
    await prisma.weekProgress.deleteMany({ where: { enrollment: { userId: existing.id } } })
    await prisma.enrollment.deleteMany({ where: { userId: existing.id } })
    await prisma.holeScore.deleteMany({ where: { round: { userId: existing.id } } })
    await prisma.round.deleteMany({ where: { userId: existing.id } })
    await prisma.booking.deleteMany({ where: { userId: existing.id } })
    await prisma.user.delete({ where: { id: existing.id } })
  }
  const user = await prisma.user.create({ data: { email: EMAIL } })

  // A program in progress: enroll, activate, complete the first two weeks.
  const payments = new StubPayments()
  const { enrollment } = await enroll({ userId: user.id, programSlug: 'putting-intensive-4', payments })
  await confirmEnrollment({ enrollmentId: enrollment.id, payments })
  for (const week of [1, 2]) {
    await prisma.weekProgress.create({
      data: { enrollmentId: enrollment.id, week, homeworkDone: true, completedAt: new Date() },
    })
  }

  // A demo course with 9 par-4 holes and two rounds — worse, then better putting.
  const course = await prisma.course.upsert({
    where: { slug: 'demo-lions-municipal' },
    update: {},
    create: {
      sourceId: 'demo_lions', slug: 'demo-lions-municipal', name: 'Lions Municipal (demo)',
      country: 'US', place: 'Austin, TX', latitude: 30.2895, longitude: -97.7899, coverage: 'DETAILED',
    },
  })
  const holeCount = await prisma.hole.count({ where: { courseId: course.id } })
  if (holeCount === 0) {
    for (let n = 1; n <= 9; n++) {
      await prisma.hole.create({
        data: { courseId: course.id, number: n, par: 4, lengthMeters: 340, strokeIndex: n, path: [] },
      })
    }
  }
  const holes = await prisma.hole.findMany({ where: { courseId: course.id }, orderBy: { number: 'asc' } })

  async function round(playedOn: Date, putts: number, penalties: number) {
    const r = await prisma.round.create({ data: { userId: user.id, courseId: course.id, playedOn } })
    for (const hole of holes) {
      await prisma.holeScore.create({
        data: {
          roundId: r.id, holeId: hole.id, holeNumber: hole.number,
          strokes: 5, putts, greenInRegulation: false, fairwayHit: true, penalties,
        },
      })
    }
  }
  await round(new Date('2026-08-09'), 2, 1) // 18 putts
  await round(new Date('2026-08-30'), 1, 0) // 9 putts

  // An upcoming lesson.
  let pro = await prisma.pro.findFirst()
  if (!pro) {
    const proUser = await prisma.user.upsert({
      where: { email: 'tom@pocketpro.test' }, update: {}, create: { email: 'tom@pocketpro.test' },
    })
    pro = await prisma.pro.upsert({
      where: { userId: proUser.id }, update: {},
      create: { userId: proUser.id, displayName: 'Tom Harris' },
    })
  }
  const product = await prisma.lessonProduct.create({
    data: { proId: pro.id, name: 'Private lesson with Tom', minutes: 60, priceMinor: 12000 },
  })
  const starts = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
  await prisma.booking.create({
    data: {
      userId: user.id, proId: pro.id, productId: product.id, startsAt: starts,
      endsAt: new Date(starts.getTime() + 60 * 60 * 1000), status: 'CONFIRMED',
      priceMinor: 12000, currency: 'usd', paymentProvider: 'STUB', paymentReference: 'stub_demo',
    },
  })

  console.log(`Seeded demo student: ${EMAIL}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
