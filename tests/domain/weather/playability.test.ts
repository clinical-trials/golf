import { describe, it, expect } from 'vitest'
import { scorePlayability, type HourForecast } from '@/domain/weather/playability'
import { StubWeather } from '@/domain/weather/port'

const hour = (over: Partial<HourForecast> = {}): HourForecast => ({
  time: '2026-09-01T09:00:00Z', tempC: 22, windKph: 8, precipProbability: 5, ...over,
})

describe('playability', () => {
  it('calls a calm, warm, dry window great', () => {
    const report = scorePlayability(Array.from({ length: 5 }, () => hour()))
    expect(report.verdict).toBe('GREAT')
    expect(report.score).toBeGreaterThanOrEqual(90)
    expect(report.reasons).toEqual(['Clear, calm and comfortable'])
  })

  it('downgrades a rainy window and says why', () => {
    const report = scorePlayability(Array.from({ length: 5 }, () => hour({ precipProbability: 85 })))
    expect(report.verdict).not.toBe('GREAT')
    expect(report.reasons).toContain('Rain likely')
  })

  it('flags strong wind', () => {
    const report = scorePlayability(Array.from({ length: 4 }, () => hour({ windKph: 38 })))
    expect(report.reasons).toContain('Strong wind')
    expect(report.score).toBeLessThan(75)
  })

  it('a cold, wet, windy window is a skip', () => {
    const report = scorePlayability(
      Array.from({ length: 5 }, () => hour({ tempC: 2, windKph: 35, precipProbability: 90 })),
    )
    expect(report.verdict).toBe('SKIP')
  })

  it('refuses an empty forecast', () => {
    expect(() => scorePlayability([])).toThrow(/no forecast/i)
  })

  it('stub weather returns the requested window length', async () => {
    const stub = new StubWeather(Array.from({ length: 12 }, () => hour()))
    const hours = await stub.hourly(35, -106, 5)
    expect(hours).toHaveLength(5)
  })
})
