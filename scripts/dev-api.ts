/**
 * Minimal dev HTTP harness for the App Router route handlers, run under tsx.
 *
 * Why this exists: the repo currently has TypeScript 7 installed, which
 * Next.js 15 cannot compile with (`next dev` aborts: "TypeScript 7 ... is not
 * supported"). Fix before deploy by pinning `typescript@^6` or upgrading Next
 * to >= 16.2.11. Until then this harness serves the SAME route.ts handlers over
 * real HTTP (tsx handles TS7 fine) so the API can be exercised end-to-end.
 *
 *   DATABASE_URL=... DEV_AUTH=1 pnpm exec tsx scripts/dev-api.ts   # :3007
 *
 * It is a verification/dev tool, not the production server — Next serves these
 * same handlers once the TypeScript/Next version mismatch is resolved.
 */
import 'dotenv/config'
import { createServer } from 'node:http'
import { GET as dashboardGET } from '@/app/api/dashboard/route'
import { POST as sessionPOST, DELETE as sessionDELETE } from '@/app/api/auth/session/route'
import { GET as programsGET } from '@/app/api/programs/route'

type Handler = (req: Request) => Promise<Response>
const routes: Record<string, Record<string, Handler>> = {
  '/api/dashboard': { GET: dashboardGET },
  '/api/auth/session': { POST: sessionPOST, DELETE: sessionDELETE },
  '/api/programs': { GET: programsGET },
}

const port = Number(process.env.PORT ?? 3007)

const server = createServer(async (nodeReq, nodeRes) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  }
  if (nodeReq.method === 'OPTIONS') {
    nodeRes.writeHead(204, cors)
    nodeRes.end()
    return
  }
  try {
    const url = new URL(nodeReq.url ?? '/', `http://localhost:${port}`)
    const handler = routes[url.pathname]?.[nodeReq.method ?? 'GET']
    if (!handler) {
      nodeRes.writeHead(404, cors)
      nodeRes.end('not found')
      return
    }

    const chunks: Buffer[] = []
    for await (const c of nodeReq) chunks.push(c as Buffer)
    const hasBody = chunks.length > 0 && nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD'

    const request = new Request(url.toString(), {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string>,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    })

    const res = await handler(request)
    const body = Buffer.from(await res.arrayBuffer())
    res.headers.forEach((v, k) => nodeRes.setHeader(k, v))
    for (const [k, v] of Object.entries(cors)) nodeRes.setHeader(k, v)
    nodeRes.statusCode = res.status
    nodeRes.end(body)
  } catch (e) {
    nodeRes.writeHead(500, cors)
    nodeRes.end(String((e as Error).message))
  }
})

server.listen(port, () => console.log(`dev api on http://localhost:${port}`))
