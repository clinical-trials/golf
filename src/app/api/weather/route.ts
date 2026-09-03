import { weather } from '@/lib/weather'
import { scorePlayability } from '@/domain/weather/playability'

/**
 * GET /api/weather?lat=&lon=&hours= — is the next round-length window worth
 * playing? Forecast: US National Weather Service (public domain, US only).
 * No user data involved, so no consent gate.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const hours = Math.min(Math.max(Number(params.get('hours') ?? 5), 1), 12)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: 'lat and lon are required numbers' }, { status: 400 })
  }

  try {
    const forecast = await weather.hourly(lat, lon, hours)
    if (forecast.length === 0) {
      return Response.json({ error: 'No forecast available for this location' }, { status: 404 })
    }
    return Response.json({
      playability: scorePlayability(forecast),
      forecast,
      source: 'US National Weather Service (api.weather.gov), public domain',
    })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 })
  }
}
