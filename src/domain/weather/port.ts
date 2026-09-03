import type { HourForecast } from './playability'

export interface WeatherPort {
  /** Hourly forecast for a point, starting now, at least `hours` entries when available. */
  hourly(latitude: number, longitude: number, hours: number): Promise<HourForecast[]>
}

/** Test double: returns exactly the hours it was constructed with. */
export class StubWeather implements WeatherPort {
  constructor(private readonly forecast: HourForecast[]) {}

  async hourly(_lat: number, _lon: number, hours: number): Promise<HourForecast[]> {
    return this.forecast.slice(0, hours)
  }
}

/**
 * US National Weather Service (api.weather.gov): free, public domain, no API
 * key — but United States coverage only, which matches the US-first course
 * focus. Two calls: /points resolves the forecast office and grid, then the
 * hourly forecast URL it returns is fetched. NWS asks for a descriptive
 * User-Agent.
 */
export class NwsWeather implements WeatherPort {
  private readonly agent = 'pocket-pro-weather/0.1 (github.com/clinical-trials/golf)'

  async hourly(latitude: number, longitude: number, hours: number): Promise<HourForecast[]> {
    const headers = { 'User-Agent': this.agent, Accept: 'application/geo+json' }

    const pointRes = await fetch(
      `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      { headers },
    )
    if (!pointRes.ok) throw new Error(`NWS points lookup failed: ${pointRes.status}`)
    const point = (await pointRes.json()) as { properties?: { forecastHourly?: string } }
    const url = point.properties?.forecastHourly
    if (!url) throw new Error('NWS returned no hourly forecast URL — likely outside US coverage')

    const forecastRes = await fetch(url, { headers })
    if (!forecastRes.ok) throw new Error(`NWS hourly forecast failed: ${forecastRes.status}`)
    const forecast = (await forecastRes.json()) as {
      properties?: {
        periods?: {
          startTime: string
          temperature: number
          temperatureUnit: string
          windSpeed: string | null
          probabilityOfPrecipitation?: { value: number | null }
        }[]
      }
    }

    const periods = forecast.properties?.periods ?? []
    return periods.slice(0, hours).map((p) => {
      const tempC = p.temperatureUnit === 'F' ? ((p.temperature - 32) * 5) / 9 : p.temperature
      const mph = Number((p.windSpeed ?? '0').match(/\d+/)?.[0] ?? 0)
      return {
        time: p.startTime,
        tempC: Math.round(tempC * 10) / 10,
        windKph: Math.round(mph * 1.60934),
        precipProbability: p.probabilityOfPrecipitation?.value ?? 0,
      }
    })
  }
}

export function selectWeather(env: Record<string, string | undefined>): WeatherPort {
  if (env.WEATHER_DISABLED === '1') return new StubWeather([])
  return new NwsWeather()
}
