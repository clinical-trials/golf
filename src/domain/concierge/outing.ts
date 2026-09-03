import { prisma } from '@/lib/db'
import type { CoverageGrade } from '@prisma/client'
import type { WeatherPort } from '@/domain/weather/port'
import { bestWindows, type WindowSuggestion } from '@/domain/weather/windows'

/**
 * The outing planner ("concierge"): given where a group is, who they are, and
 * how long they have, rank the charted courses that fit and say when to play.
 *
 * Honest scope: it recommends from OUR course data and NWS weather. It does not
 * claim live tee-time availability — booking inventory would need course
 * partnerships, and inventing it would be fabrication. "Busy tee sheet" advice
 * is delivered as ranked options + best windows, which is what we truly know.
 */
export type GroupType = 'BEGINNERS' | 'CORPORATE' | 'FAMILY' | 'REGULARS'

export interface OutingSuggestion {
  slug: string
  name: string
  place: string
  coverage: CoverageGrade
  holeCount: number
  shortCourse: boolean
  distanceKm: number
  fitScore: number
  why: string[]
}

export interface OutingPlan {
  groupType: GroupType
  windows: WindowSuggestion[]
  suggestions: OutingSuggestion[]
}

const EARTH_KM = 6371

export function haversineKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a))
}

export async function planOuting(input: {
  latitude: number
  longitude: number
  groupType: GroupType
  roundHours?: number
  weather: WeatherPort
  maxDistanceKm?: number
  limit?: number
}): Promise<OutingPlan> {
  const roundHours = input.roundHours ?? 4
  const maxKm = input.maxDistanceKm ?? 80
  const limit = input.limit ?? 5

  const courses = await prisma.course.findMany({
    include: { holes: { select: { number: true, par: true } } },
  })

  const suggestions: OutingSuggestion[] = []
  for (const course of courses) {
    if (course.holes.length === 0) continue
    const distanceKm = haversineKm(input.latitude, input.longitude, course.latitude, course.longitude)
    if (distanceKm > maxKm) continue

    const pars = course.holes.map((h) => h.par).filter((p): p is number => p !== null)
    const avgPar = pars.length ? pars.reduce((s, p) => s + p, 0) / pars.length : null
    const shortCourse = course.holes.length <= 9 || (avgPar !== null && avgPar <= 3.3)

    const why: string[] = []
    let fit = 50

    if (input.groupType === 'REGULARS') {
      if (course.holes.length >= 18) { fit += 20; why.push('Full 18 for a regular game') }
      else { fit -= 10 }
    } else {
      // Beginners, corporate socials and families all start better on short courses:
      // faster, cheaper, less intimidating — the off-course/short-course on-ramp.
      if (shortCourse) { fit += 25; why.push('Short course — relaxed pace, beginner-friendly') }
      else { fit += 5; why.push('Full course — better once the group has played together') }
    }

    if (course.coverage === 'DETAILED' || course.coverage === 'VERIFIED') {
      fit += 10
      why.push('Fully charted — hole maps and strategy in the app')
    }

    fit -= Math.min(distanceKm * 0.4, 25)
    why.push(`${Math.round(distanceKm)} km away`)

    suggestions.push({
      slug: course.slug,
      name: course.name,
      place: course.place,
      coverage: course.coverage,
      holeCount: course.holes.length,
      shortCourse,
      distanceKm: Math.round(distanceKm * 10) / 10,
      fitScore: Math.round(fit),
      why,
    })
  }

  suggestions.sort((a, b) => b.fitScore - a.fitScore)

  const hours = await input.weather.hourly(input.latitude, input.longitude, 24)
  const windows = hours.length >= roundHours ? bestWindows(hours, roundHours, 3) : []

  return { groupType: input.groupType, windows, suggestions: suggestions.slice(0, limit) }
}
