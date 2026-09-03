import { resolveSession } from '@/domain/auth/session'
import { readSessionToken } from '@/domain/auth/http'
import { buildDashboardSummary } from '@/domain/dashboard/summary'

/** GET /api/dashboard — the signed-in student's real dashboard payload.
 *  Requires a valid session (Bearer token or pp_session cookie). */
export async function GET(request: Request): Promise<Response> {
  const userId = await resolveSession(readSessionToken(request))
  if (!userId) return Response.json({ error: 'not authenticated' }, { status: 401 })
  return Response.json(await buildDashboardSummary(userId))
}
