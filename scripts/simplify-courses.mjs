/**
 * Reduces docs/courses.json to a web-deliverable size.
 *
 * Ramer–Douglas–Peucker at roughly two metres, then coordinates rounded to
 * six decimal places (about 0.1 m). Both are well below what is visible at
 * hole-map scale, so shapes are unchanged to the eye.
 *
 * Usage: node scripts/simplify-courses.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'

const EPSILON_DEGREES = 0.00002 // ~2 m of latitude
const PRECISION = 6

function perpendicularDistance([py, px], [ay, ax], [by, bx]) {
  const dy = by - ay
  const dx = bx - ax
  if (dy === 0 && dx === 0) return Math.hypot(py - ay, px - ax)
  const t = ((py - ay) * dy + (px - ax) * dx) / (dy * dy + dx * dx)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(py - (ay + clamped * dy), px - (ax + clamped * dx))
}

function simplify(points, epsilon) {
  if (points.length < 3) return points

  let maxDistance = 0
  let index = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance <= epsilon) return [first, last]

  const left = simplify(points.slice(0, index + 1), epsilon)
  const right = simplify(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

const round = (points) => points.map(([lat, lon]) => [Number(lat.toFixed(PRECISION)), Number(lon.toFixed(PRECISION))])

const data = JSON.parse(readFileSync('docs/courses.json', 'utf8'))

let before = 0
let after = 0

for (const course of data.courses) {
  for (const hole of course.holes) {
    before += hole.path.length
    hole.path = round(simplify(hole.path, EPSILON_DEGREES))
    after += hole.path.length
  }
  // Tees are tiny and add nothing at map scale.
  course.features = course.features.filter((f) => f.kind !== 'TEE')
  for (const feature of course.features) {
    before += feature.ring.length
    feature.ring = round(simplify(feature.ring, EPSILON_DEGREES))
    after += feature.ring.length
  }
}

data.simplified = { epsilonDegrees: EPSILON_DEGREES, precision: PRECISION }

writeFileSync('docs/courses.json', JSON.stringify(data))
console.log(`points ${before} -> ${after} (${Math.round((1 - after / before) * 100)}% fewer)`)
