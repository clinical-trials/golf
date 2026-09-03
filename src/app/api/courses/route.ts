import { prisma } from '@/lib/db'
import { COVERAGE_LABELS } from '@/domain/course/coverage'
import { getPublishedTips } from '@/domain/course/tips'

/**
 * GET /api/courses           — directory: every charted course, grouped by region.
 * GET /api/courses?slug=...   — one course with holes, coverage in words, and
 *                               Tom's published tips (players never see drafts).
 */
export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get('slug')

  if (!slug) {
    const courses = await prisma.course.findMany({
      orderBy: [{ country: 'asc' }, { place: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true, country: true, place: true, coverage: true, _count: { select: { holes: true } } },
    })
    return Response.json({
      total: courses.length,
      courses: courses.map((c) => ({ ...c, holeCount: c._count.holes, _count: undefined })),
    })
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { holes: { orderBy: { number: 'asc' } } },
  })
  if (!course) return Response.json({ error: 'course not found' }, { status: 404 })

  const tips = await getPublishedTips(slug)
  return Response.json({
    slug: course.slug,
    name: course.name,
    place: course.place,
    coverage: course.coverage,
    coverageLabel: COVERAGE_LABELS[course.coverage],
    holes: course.holes.map((h) => ({ number: h.number, par: h.par, meters: h.lengthMeters, strokeIndex: h.strokeIndex })),
    tips: tips.map((t) => ({ holeNumber: t.holeNumber, body: t.body })),
  })
}
