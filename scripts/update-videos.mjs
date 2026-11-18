// Regenerates docs/videos.json from Tom Harris's YouTube channel feed, so the
// site's "Latest video" tab follows new uploads. No API key, no dependencies.
//
//   node scripts/update-videos.mjs
//
// Run hourly by .github/workflows/update-videos.yml. Safe to run by hand.
// On any failure (network, or a response that isn't the feed) it exits non-zero
// and leaves the existing file untouched, so the site keeps the last good list.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CHANNEL_ID = 'UCK-_0YkiGuvISUZQKN8PeNw'
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
const OUT_FILE = fileURLToPath(new URL('../docs/videos.json', import.meta.url))

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// One pass, so "&amp;lt;" decodes to "&lt;" and not on to "<".
function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, name) => {
    const key = name.toLowerCase()
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16))
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10))
    return NAMED_ENTITIES[key]
  })
}

const firstTag = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].trim() : ''
}

/**
 * Parse a YouTube channel feed into videos, most recently published first.
 * Returns [] for anything that isn't a feed (an error page, an empty body).
 * @param {string} xml
 * @returns {{id: string, title: string, published: string}[]}
 */
export function parseFeed(xml) {
  const videos = []
  for (const [, entry] of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = firstTag(entry, 'yt:videoId')
    const title = decodeEntities(firstTag(entry, 'title'))
    if (!/^[\w-]{11}$/.test(id) || !title) continue
    videos.push({ id, title, published: firstTag(entry, 'published') })
  }
  // The feed already lists newest first; sort anyway so "latest" never depends
  // on that. Entries with an unreadable date keep their feed position.
  return videos.sort((a, b) => (Date.parse(b.published) - Date.parse(a.published)) || 0)
}

/**
 * The exact file the site reads: {"videos":[{"id","title"},...]}.
 * @param {{id: string, title: string, published?: string}[]} videos
 */
export function toVideosJson(videos) {
  return JSON.stringify({ videos: videos.map(({ id, title }) => ({ id, title })) }, null, 2) + '\n'
}

async function fetchFeed(attempts = 3) {
  let lastError
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(20_000) })
      if (!res.ok) throw new Error(`YouTube feed returned HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      lastError = err
      if (i < attempts) await new Promise((r) => setTimeout(r, 5_000 * i))
    }
  }
  throw lastError
}

async function main() {
  const videos = parseFeed(await fetchFeed())
  if (!videos.length) throw new Error('The feed had no videos in it; leaving docs/videos.json as it is.')

  const next = toVideosJson(videos)
  const current = await readFile(OUT_FILE, 'utf8').catch(() => '')
  const newest = `${videos[0].id} "${videos[0].title}" (${videos[0].published})`
  if (next === current) {
    console.log(`docs/videos.json is already current. Newest: ${newest}`)
    return
  }
  await writeFile(OUT_FILE, next)
  console.log(`Updated docs/videos.json (${videos.length} videos). Newest: ${newest}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`update-videos failed: ${err.message}`)
    process.exit(1)
  })
}
