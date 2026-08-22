/**
 * Pulls real golf course geometry from OpenStreetMap via the Overpass API
 * and writes it to docs/courses.json for the prototype to render.
 *
 * Data is OpenStreetMap, licensed ODbL. Attribution is required wherever it
 * is displayed. Nothing here is scraped from a commercial golf directory.
 *
 * Usage: node scripts/fetch-courses.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'

const OVERPASS = 'https://overpass-api.de/api/interpreter'

// Curated set spanning five continents. Bounding boxes are south,west,north,east.
const COURSES = [
  { id: 'st-andrews-old', name: 'The Old Course at St Andrews', place: 'Fife, Scotland', country: 'GB', bbox: '56.328,-2.835,56.368,-2.765' },
  { id: 'pebble-beach', name: 'Pebble Beach Golf Links', place: 'California, USA', country: 'US', bbox: '36.556,-121.960,36.578,-121.928' },
  { id: 'paa-ko-ridge', name: 'Paa-Ko Ridge Golf Club', place: 'New Mexico, USA', country: 'US', bbox: '35.175,-106.360,35.225,-106.300' },
  { id: 'royal-county-down', name: 'Royal County Down', place: 'Down, Northern Ireland', country: 'GB', bbox: '54.210,-5.905,54.235,-5.855' },
  { id: 'bethpage-black', name: 'Bethpage State Park', place: 'New York, USA', country: 'US', bbox: '40.728,-73.475,40.760,-73.430' },
  { id: 'le-golf-national', name: 'Le Golf National', place: 'Île-de-France, France', country: 'FR', bbox: '48.750,2.055,48.780,2.100' },
  { id: 'royal-melbourne', name: 'Royal Melbourne Golf Club', place: 'Victoria, Australia', country: 'AU', bbox: '-38.025,144.995,-37.960,145.070' },
  { id: 'fancourt', name: 'Fancourt', place: 'Western Cape, South Africa', country: 'ZA', bbox: '-33.990,22.360,-33.930,22.450' },
  { id: 'kasumigaseki', name: 'Kasumigaseki Country Club', place: 'Saitama, Japan', country: 'JP', bbox: '35.895,139.375,35.965,139.485' },

  // Weighted toward the United States, because USGS aerial imagery is public
  // domain there and no free equivalent exists elsewhere at that resolution.
  { id: 'torrey-pines', name: 'Torrey Pines Golf Course', place: 'California, USA', country: 'US', bbox: '32.882,-117.264,32.914,-117.234' },
  { id: 'tpc-sawgrass', name: 'TPC Sawgrass', place: 'Florida, USA', country: 'US', bbox: '30.186,-81.408,30.212,-81.376' },
  { id: 'pinehurst-no2', name: 'Pinehurst Resort', place: 'North Carolina, USA', country: 'US', bbox: '35.178,-79.482,35.212,-79.448' },
  { id: 'chambers-bay', name: 'Chambers Bay', place: 'Washington, USA', country: 'US', bbox: '47.190,-122.592,47.220,-122.552' },
  { id: 'erin-hills', name: 'Erin Hills', place: 'Wisconsin, USA', country: 'US', bbox: '43.228,-88.372,43.266,-88.328' },
  { id: 'unm-championship', name: 'UNM Championship Course', place: 'New Mexico, USA', country: 'US', bbox: '35.048,-106.622,35.076,-106.588' },
]

const FEATURE_TAGS = {
  green: 'GREEN',
  bunker: 'BUNKER',
  water_hazard: 'WATER',
  lateral_water_hazard: 'WATER',
  fairway: 'FAIRWAY',
  tee: 'TEE',
}

async function overpass(bbox) {
  const query = `[out:json][timeout:90];
    (
      way["golf"](${bbox});
      relation["golf"](${bbox});
    );
    out geom;`

  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'pocket-pro-course-charting/0.1 (github.com/clinical-trials/golf)',
    },
    body: new URLSearchParams({ data: query }).toString(),
  })
  if (!response.ok) throw new Error(`Overpass ${response.status}`)
  const payload = await response.json()
  return payload.elements ?? []
}

function toNumber(value) {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Flattens a way or a multipolygon relation into a single ring of points. */
function ringOf(element) {
  if (Array.isArray(element.geometry)) return element.geometry
  if (Array.isArray(element.members)) {
    const outer = element.members.find((m) => m.role === 'outer' && Array.isArray(m.geometry))
    if (outer) return outer.geometry
  }
  return null
}

function normalise(elements) {
  const holes = []
  const features = []

  for (const element of elements) {
    const golf = element.tags?.golf
    const ring = ringOf(element)
    if (!golf || !ring?.length) continue

    if (golf === 'hole') {
      const number = toNumber(element.tags.ref)
      if (number === null) continue
      holes.push({
        number,
        name: element.tags.name ?? null,
        par: toNumber(element.tags.par),
        meters: toNumber(element.tags.dist),
        strokeIndex: toNumber(element.tags['handicap:men'] ?? element.tags.handicap),
        path: ring.map((p) => [p.lat, p.lon]),
      })
      continue
    }

    const kind = FEATURE_TAGS[golf]
    if (!kind) continue
    features.push({ kind, hole: toNumber(element.tags.ref), ring: ring.map((p) => [p.lat, p.lon]) })
  }

  const seen = new Set()
  const unique = holes
    .sort((a, b) => a.number - b.number)
    .filter((h) => (seen.has(h.number) ? false : seen.add(h.number)))

  return { holes: unique, features }
}

function coverage(course) {
  if (course.holes.length === 0) return 'LISTED'
  const greens = course.features.some((f) => f.kind === 'GREEN')
  const hazards = course.features.some((f) => f.kind === 'BUNKER' || f.kind === 'WATER')
  return greens && hazards ? 'DETAILED' : 'ROUTED'
}

// Reuse anything already fetched successfully so re-runs only hit Overpass for
// courses that are missing or came back empty. It is a free, shared service.
const existing = existsSync('docs/courses.json')
  ? JSON.parse(readFileSync('docs/courses.json', 'utf8')).courses ?? []
  : []

const results = []

for (const course of COURSES) {
  const cached = existing.find((c) => c.id === course.id)
  if (cached && cached.holes.length >= 9) {
    results.push(cached)
    console.log(`${course.name} … cached (${cached.holes.length} holes)`)
    continue
  }

  process.stdout.write(`${course.name} … `)
  try {
    const elements = await overpass(course.bbox)
    const { holes, features } = normalise(elements)
    const record = { ...course, holes, features }
    record.coverage = coverage(record)
    results.push(record)
    console.log(`${holes.length} holes, ${features.length} features, ${record.coverage}`)
  } catch (error) {
    console.log(`FAILED — ${error.message}`)
  }
  await new Promise((resolve) => setTimeout(resolve, 4000))
}

mkdirSync('docs', { recursive: true })
writeFileSync(
  'docs/courses.json',
  JSON.stringify({ attribution: '© OpenStreetMap contributors, ODbL', fetched: process.argv[2] ?? null, courses: results }, null, 1),
)

const holes = results.reduce((sum, c) => sum + c.holes.length, 0)
console.log(`\nWrote docs/courses.json — ${results.length} courses, ${holes} holes`)
