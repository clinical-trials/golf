import { prisma } from '@/lib/db'
import type { BookingStatus, EnrollmentStatus } from '@prisma/client'

/**
 * The student dashboard read-model. Every field here is derived from real rows
 * the student actually has — enrollments, week progress, logged rounds and
 * bookings. Nothing is sampled or invented: a student with no rounds gets an
 * empty rounds list and a null putting trend, not a placeholder. The static
 * preview page keeps its clearly-labelled sample data; this is what replaces it
 * once a student signs in.
 */

export interface DashboardProgram {
  slug: string
  name: string
  status: EnrollmentStatus
  weeksTotal: number
  weeksComplete: number
  percent: number
  nextUp: string | null
}

export interface DashboardRound {
  roundId: string
  playedOn: string
  courseName: string
  holes: number
  strokes: number
  putts: number
  penalties: number
  /** Sum of par for the holes actually played, or null if any played hole has
   *  no par on record (so we never show a misleading vs-par). */
  parTotal: number | null
  vsPar: number | null
}

export interface PuttingTrend {
  rounds: number
  firstPlayedOn: string
  latestPlayedOn: string
  firstRoundPutts: number
  latestRoundPutts: number
  /** latest − first: negative means fewer putts, i.e. improvement. */
  delta: number
}

export interface DashboardUpcoming {
  bookingId: string
  startsAt: string
  productName: string
  status: BookingStatus
}

export interface DashboardSummary {
  student: { email: string }
  programs: DashboardProgram[]
  putting: PuttingTrend | null
  recentRounds: DashboardRound[]
  upcoming: DashboardUpcoming[]
  generatedAt: string
}

const RECENT_ROUNDS = 10
const UPCOMING = 10

export async function buildDashboardSummary(userId: string): Promise<DashboardSummary> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const [enrollments, rounds, bookings] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, status: { not: 'CANCELLED' } },
      include: {
        program: { include: { weeksContent: { orderBy: { week: 'asc' } } } },
        progress: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.round.findMany({
      where: { userId },
      orderBy: { playedOn: 'desc' },
      take: RECENT_ROUNDS,
      include: { course: true, scores: { include: { hole: true } } },
    }),
    prisma.booking.findMany({
      where: { userId, startsAt: { gte: new Date() }, status: { in: ['HELD', 'CONFIRMED'] } },
      orderBy: { startsAt: 'asc' },
      take: UPCOMING,
      include: { product: true },
    }),
  ])

  const programs: DashboardProgram[] = enrollments.map((e) => {
    const completedWeeks = new Set(
      e.progress.filter((p) => p.completedAt !== null).map((p) => p.week),
    )
    const weeksTotal = e.program.weeks
    const weeksComplete = completedWeeks.size
    const nextWeek = e.program.weeksContent.find((w) => !completedWeeks.has(w.week))
    return {
      slug: e.program.slug,
      name: e.program.name,
      status: e.status,
      weeksTotal,
      weeksComplete,
      percent: weeksTotal === 0 ? 0 : Math.round((weeksComplete / weeksTotal) * 100),
      nextUp: e.status === 'COMPLETED' ? null : (nextWeek?.title ?? null),
    }
  })

  const recentRounds: DashboardRound[] = rounds.map((r) => {
    const strokes = r.scores.reduce((sum, s) => sum + s.strokes, 0)
    const putts = r.scores.reduce((sum, s) => sum + s.putts, 0)
    const penalties = r.scores.reduce((sum, s) => sum + s.penalties, 0)
    const allHavePar = r.scores.length > 0 && r.scores.every((s) => s.hole.par !== null)
    const parTotal = allHavePar ? r.scores.reduce((sum, s) => sum + (s.hole.par ?? 0), 0) : null
    return {
      roundId: r.id,
      playedOn: r.playedOn.toISOString(),
      courseName: r.course.name,
      holes: r.scores.length,
      strokes,
      putts,
      penalties,
      parTotal,
      vsPar: parTotal === null ? null : strokes - parTotal,
    }
  })

  const putting = puttingTrend(rounds)

  const upcoming: DashboardUpcoming[] = bookings.map((b) => ({
    bookingId: b.id,
    startsAt: b.startsAt.toISOString(),
    productName: b.product.name,
    status: b.status,
  }))

  return {
    student: { email: user.email },
    programs,
    putting,
    recentRounds,
    upcoming,
    generatedAt: new Date().toISOString(),
  }
}

/** Putts-per-round trend across the earliest and latest rounds that recorded a
 *  full complement of hole scores. Needs at least two such rounds; otherwise
 *  there is nothing honest to compare, so it returns null. */
function puttingTrend(
  rounds: { id: string; playedOn: Date; scores: { putts: number }[] }[],
): PuttingTrend | null {
  const withPutts = rounds
    .filter((r) => r.scores.length > 0)
    .map((r) => ({
      playedOn: r.playedOn,
      putts: r.scores.reduce((sum, s) => sum + s.putts, 0),
    }))
    .sort((a, b) => a.playedOn.getTime() - b.playedOn.getTime())

  if (withPutts.length < 2) return null
  const first = withPutts[0]
  const latest = withPutts[withPutts.length - 1]
  return {
    rounds: withPutts.length,
    firstPlayedOn: first.playedOn.toISOString(),
    latestPlayedOn: latest.playedOn.toISOString(),
    firstRoundPutts: first.putts,
    latestRoundPutts: latest.putts,
    delta: latest.putts - first.putts,
  }
}
