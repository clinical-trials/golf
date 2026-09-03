import { weather } from '@/lib/weather'
import { planOuting, type GroupType } from '@/domain/concierge/outing'

const GROUPS = new Set(['BEGINNERS', 'CORPORATE', 'FAMILY', 'REGULARS'])

/**
 * GET /api/concierge?lat=&lon=&group=&hours= — ranked course suggestions for a
 * group plus the best round-length weather windows. No personal data, no gate.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const group = (params.get('group') ?? 'BEGINNERS').toUpperCase()
  const hours = Math.min(Math.max(Number(params.get('hours') ?? 4), 2), 6)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: 'lat and lon are required numbers' }, { status: 400 })
  }
  if (!GROUPS.has(group)) {
    return Response.json({ error: `group must be one of ${[...GROUPS].join(', ')}` }, { status: 400 })
  }

  try {
    const plan = await planOuting({
      latitude: lat,
      longitude: lon,
      groupType: group as GroupType,
      roundHours: hours,
      weather,
    })
    return Response.json(plan)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 })
  }
}
