import { prisma } from '@/lib/db'
import type { Course, CoverageGrade } from '@prisma/client'

/**
 * The shape one course takes in docs/courses.json — the file produced by
 * scripts/fetch-courses.mjs from OpenStreetMap. Importing that file is how the
 * real fetched geometry reaches the database.
 */
export interface CourseJson {
  id: string
  name: string
  place: string
  country: string
  coverage: string
  holes: {
    number: number
    name?: string | null
    par: number | null
    meters: number | null
    strokeIndex: number | null
    path: [number, number][]
  }[]
  features: { kind: string; hole: number | null; ring: [number, number][] }[]
}

const GRADES = new Set(['LISTED', 'ROUTED', 'DETAILED', 'VERIFIED'])
const KINDS = new Set(['GREEN', 'BUNKER', 'WATER', 'FAIRWAY', 'TEE', 'ROUGH'])

/**
 * Idempotent: importing the same course twice replaces its holes and features
 * rather than duplicating them. The slug is stable (`country/id`), so links
 * survive re-imports.
 */
export async function importCourse(json: CourseJson): Promise<Course> {
  const coverage = (GRADES.has(json.coverage) ? json.coverage : 'LISTED') as CoverageGrade
  const first = json.holes[0]?.path[0]
  const [latitude, longitude] = first ?? [0, 0]

  const data = {
    slug: `${json.country.toLowerCase()}/${json.id}`,
    name: json.name,
    country: json.country,
    place: json.place,
    latitude,
    longitude,
    coverage,
  }

  const course = await prisma.course.upsert({
    where: { sourceId: json.id },
    update: data,
    create: { ...data, sourceId: json.id },
  })

  await prisma.courseFeature.deleteMany({ where: { courseId: course.id } })
  await prisma.hole.deleteMany({ where: { courseId: course.id } })

  for (const hole of json.holes) {
    await prisma.hole.create({
      data: {
        courseId: course.id,
        number: hole.number,
        par: hole.par,
        lengthMeters: hole.meters,
        strokeIndex: hole.strokeIndex,
        path: hole.path,
      },
    })
  }

  for (const feature of json.features) {
    if (!KINDS.has(feature.kind)) continue
    await prisma.courseFeature.create({
      data: {
        courseId: course.id,
        kind: feature.kind as any,
        holeNumber: feature.hole,
        ring: feature.ring,
      },
    })
  }

  return course
}
