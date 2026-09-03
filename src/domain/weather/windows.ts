import { scorePlayability, type HourForecast, type PlayabilityReport } from './playability'

export interface WindowSuggestion {
  startsAt: string
  endsAt: string
  report: PlayabilityReport
}

/**
 * Heat-proof scheduling: slide a round-length window across the hourly
 * forecast and rank the windows. In hot-summer markets the winners are dawn
 * and twilight — this is what turns "midday golf is brutal" into "here's when
 * to play instead" rather than a cancelled round.
 */
export function bestWindows(
  hours: HourForecast[],
  windowHours: number,
  top = 3,
): WindowSuggestion[] {
  if (windowHours < 1) throw new Error('windowHours must be at least 1')
  if (hours.length < windowHours) {
    throw new Error(`Need at least ${windowHours} forecast hours, received ${hours.length}`)
  }

  const scored: WindowSuggestion[] = []
  for (let start = 0; start + windowHours <= hours.length; start++) {
    const slice = hours.slice(start, start + windowHours)
    scored.push({
      startsAt: slice[0]!.time,
      endsAt: slice[slice.length - 1]!.time,
      report: scorePlayability(slice),
    })
  }

  // Greedy non-overlapping pick, best score first, earlier start on ties.
  scored.sort((a, b) => b.report.score - a.report.score || a.startsAt.localeCompare(b.startsAt))
  const picked: WindowSuggestion[] = []
  for (const candidate of scored) {
    if (picked.length >= top) break
    const overlaps = picked.some(
      (p) => candidate.startsAt < p.endsAt && p.startsAt < candidate.endsAt,
    )
    if (!overlaps) picked.push(candidate)
  }
  return picked.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}
