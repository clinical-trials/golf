import { prisma } from '@/lib/db'
import type { CourseTip } from '@prisma/client'

export interface UpsertTipInput {
  courseSlug: string
  holeNumber?: number | null
  body: string
}

/**
 * Adds or replaces Tom's note for a course (or one of its holes). Created
 * unpublished — a tip is DRAFT until he approves it, so nothing reaches players
 * in his name that he hasn't written or corrected.
 */
export async function upsertCourseTip(input: UpsertTipInput): Promise<CourseTip> {
  const course = await prisma.course.findUnique({ where: { slug: input.courseSlug } })
  if (!course) throw new Error(`Course not found: ${input.courseSlug}`)
  if (input.body.trim().length < 3) throw new Error('Tip body is required')

  const holeNumber = input.holeNumber ?? null
  const existing = await prisma.courseTip.findFirst({
    where: { courseId: course.id, holeNumber },
  })

  if (existing) {
    return prisma.courseTip.update({
      where: { id: existing.id },
      data: { body: input.body.trim(), published: false },
    })
  }
  return prisma.courseTip.create({
    data: { courseId: course.id, holeNumber, body: input.body.trim() },
  })
}

export async function publishTip(tipId: string, published = true): Promise<CourseTip> {
  return prisma.courseTip.update({ where: { id: tipId }, data: { published } })
}

/** Players only ever see published tips. */
export async function getPublishedTips(courseSlug: string): Promise<CourseTip[]> {
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  if (!course) return []
  return prisma.courseTip.findMany({
    where: { courseId: course.id, published: true },
    orderBy: [{ holeNumber: 'asc' }],
  })
}
