const COOKIE_NAME = 'pp_session'

/** Reads the session token from an `Authorization: Bearer` header, falling back
 *  to the `pp_session` cookie. Returns null when neither is present. */
export function readSessionToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim()
    if (token) return token
  }
  const cookie = request.headers.get('cookie')
  if (cookie) {
    for (const part of cookie.split(';')) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      if (part.slice(0, eq).trim() === COOKIE_NAME) {
        return decodeURIComponent(part.slice(eq + 1).trim())
      }
    }
  }
  return null
}
