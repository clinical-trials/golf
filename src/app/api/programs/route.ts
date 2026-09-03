import { listPrograms } from '@/domain/program/enrollment'

/** GET /api/programs — the class catalog with weekly content. */
export async function GET(): Promise<Response> {
  const programs = await listPrograms()
  return Response.json({
    programs: programs.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      weeks: p.weeks,
      priceMinor: p.priceMinor,
      currency: p.currency,
      schedule: p.weeksContent.map((w) => ({
        week: w.week,
        title: w.title,
        videoId: w.videoId,
        homework: w.homework,
        // Quizzes ship without the answer key; scoring happens server-side.
        quiz: (w.quiz as { q: string; options: string[] }[]).map((question) => ({
          q: question.q,
          options: question.options,
        })),
      })),
    })),
  })
}
