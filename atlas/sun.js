/* AtlasSun — local solar status for each camera, no accounts, no APIs.
   Low-precision NOAA solar position (±0.3°), plenty for golden-hour badges.
   Cameras carry city-level lat/lon in data.js; sunrise shifts by under ~2
   minutes at that precision. */
(() => {
'use strict';
const RAD = Math.PI / 180;

function elevation(date, lat, lon) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545; // days since J2000
  const L = (280.460 + 0.9856474 * d) % 360;                 // mean longitude
  const g = ((357.528 + 0.9856003 * d) % 360) * RAD;         // mean anomaly
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const eps = 23.439 * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const h = ((gmst * 15 + lon) * RAD) - ra;                  // hour angle
  const el = Math.asin(Math.sin(lat * RAD) * Math.sin(dec) +
                       Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(h));
  return el / RAD;
}

function minutesUntilSunrise(camera, now) {
  let prev = elevation(now, camera.lat, camera.lon);
  for (let m = 5; m <= 1440; m += 5) {
    const el = elevation(new Date(now.getTime() + m * 60000), camera.lat, camera.lon);
    if (prev < 0 && el >= 0) return m;
    prev = el;
  }
  return null; // polar edge case
}

const fmt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

function status(camera, now = new Date()) {
  if (typeof camera.lat !== 'number' || typeof camera.lon !== 'number')
    return { phase: 'unknown', label: '', score: 0 };
  const el = elevation(now, camera.lat, camera.lon);
  const rising = elevation(new Date(now.getTime() + 600000), camera.lat, camera.lon) > el;
  const bonus = camera.embed ? 15 : 0; // playable feeds first when chasing light

  if (el >= 6) {
    if (!rising) {
      for (let m = 5; m <= 600; m += 5) {
        if (elevation(new Date(now.getTime() + m * 60000), camera.lat, camera.lon) < 6) {
          if (m <= 90) return { phase: 'pre-sunset', label: `🌇 Sunset light in ${fmt(m)}`, score: 55 - m / 5 + bonus };
          break;
        }
      }
    }
    return { phase: 'day', label: '☀️ Daylight', score: 12 + bonus };
  }
  if (el >= 0)
    return { phase: 'golden', label: rising ? '🌅 Golden hour now' : '🌇 Golden hour now',
             score: 100 - Math.abs(el - 3) * 4 + bonus };
  if (el >= -6) {
    if (rising) {
      const m = minutesUntilSunrise(camera, now);
      return { phase: 'twilight', label: `🌅 Sunrise in ${fmt(m ?? 20)}`, score: 78 + bonus };
    }
    return { phase: 'twilight', label: '🌆 Dusk — last light', score: 40 + bonus };
  }
  const m = minutesUntilSunrise(camera, now);
  if (m !== null && m <= 480)
    return { phase: 'night', label: `🌙 Sunrise in ${fmt(m)}`, score: 58 - m / 12 + bonus };
  return { phase: 'night', label: '🌙 Under the stars', score: 4 + bonus };
}

const bestGolden = (cameras, now = new Date()) =>
  cameras.slice().sort((a, b) => status(b, now).score - status(a, now).score)[0] || null;

window.AtlasSun = { elevation, status, bestGolden };
})();
