import { describe, it, expect, beforeEach } from 'vitest'
import { importCourse, type CourseJson } from '@/domain/course/import'
import { planOuting, haversineKm } from '@/domain/concierge/outing'
import { StubWeather } from '@/domain/weather/port'
import { bestWindows } from '@/domain/weather/windows'
import type { HourForecast } from '@/domain/weather/playability'
import { resetDatabase } from '../../reset'

const SHORT: CourseJson = {
  id: 'city-pitch-putt', name: 'City Pitch & Putt', place: 'Near town', country: 'US', coverage: 'DETAILED',
  holes: Array.from({ length: 9 }, (_, i) => ({
    number: i + 1, par: 3, meters: 80, strokeIndex: null, path: [[30.26, -97.75], [30.261, -97.751]] as [number, number][],
  })),
  features: [{ kind: 'GREEN', hole: 1, ring: [[30.26, -97.75], [30.2601, -97.75], [30.2601, -97.7501]] }],
}

const FULL: CourseJson = {
  id: 'big-championship', name: 'Big Championship', place: 'Further out', country: 'US', coverage: 'DETAILED',
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1, par: 4, meters: 380, strokeIndex: null, path: [[30.5, -97.6], [30.501, -97.601]] as [number, number][],
  })),
  features: [{ kind: 'GREEN', hole: 1, ring: [[30.5, -97.6], [30.5001, -97.6], [30.5001, -97.6001]] }],
}

// A hot-summer day: brutal midday, lovely evening.
function hotDay(): HourForecast[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hour = 6 + i // 06:00 through 21:00
    const midday = hour >= 11 && hour <= 16
    return {
      time: `2026-07-15T${String(hour).padStart(2, '0')}:00:00Z`,
      tempC: midday ? 38 : hour < 9 ? 24 : 27,
      windKph: 8,
      precipProbability: 5,
    }
  })
}

beforeEach(resetDatabase)

describe('haversine', () => {
  it('measures roughly 111 km per degree of latitude', () => {
    expect(haversineKm(30, -97, 31, -97)).toBeGreaterThan(105)
    expect(haversineKm(30, -97, 31, -97)).toBeLessThan(115)
  })
})

describe('heat-proof windows', () => {
  it('picks morning and evening over the brutal midday', () => {
    const windows = bestWindows(hotDay(), 4, 2)
    expect(windows).toHaveLength(2)
    for (const w of windows) {
      const startHour = Number(w.startsAt.slice(11, 13))
      const middayOverlap = startHour >= 10 && startHour <= 15
      expect(middayOverlap).toBe(false)
    }
  })

  it('refuses a window longer than the forecast', () => {
    expect(() => bestWindows(hotDay().slice(0, 2), 4)).toThrow(/at least 4/i)
  })
})

describe('outing planner', () => {
  it('ranks the short course first for beginners and corporate groups', async () => {
    await importCourse(SHORT)
    await importCourse(FULL)
    const weather = new StubWeather(hotDay())

    for (const groupType of ['BEGINNERS', 'CORPORATE', 'FAMILY'] as const) {
      const plan = await planOuting({ latitude: 30.27, longitude: -97.74, groupType, weather })
      expect(plan.suggestions[0]?.slug).toBe('us/city-pitch-putt')
      expect(plan.suggestions[0]?.shortCourse).toBe(true)
    }
  })

  it('ranks the full 18 first for regulars', async () => {
    await importCourse(SHORT)
    await importCourse(FULL)
    const plan = await planOuting({
      latitude: 30.27, longitude: -97.74, groupType: 'REGULARS', weather: new StubWeather(hotDay()),
    })
    expect(plan.suggestions[0]?.slug).toBe('us/big-championship')
  })

  it('returns heat-aware windows alongside the courses', async () => {
    await importCourse(SHORT)
    const plan = await planOuting({
      latitude: 30.27, longitude: -97.74, groupType: 'BEGINNERS', weather: new StubWeather(hotDay()),
    })
    expect(plan.windows.length).toBeGreaterThan(0)
    expect(plan.windows[0]?.report.score).toBeGreaterThan(60)
  })

  it('excludes courses beyond the distance cap and explains each pick', async () => {
    await importCourse(SHORT)
    await importCourse(FULL)
    const plan = await planOuting({
      latitude: 30.27, longitude: -97.74, groupType: 'BEGINNERS',
      weather: new StubWeather(hotDay()), maxDistanceKm: 10,
    })
    expect(plan.suggestions.map((s) => s.slug)).toEqual(['us/city-pitch-putt'])
    expect(plan.suggestions[0]?.why.join(' ')).toMatch(/short course/i)
  })
})
