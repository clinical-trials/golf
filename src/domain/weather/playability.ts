export interface HourForecast {
  time: string
  tempC: number
  windKph: number
  precipProbability: number // 0..100
}

export interface PlayabilityReport {
  score: number // 0..100
  verdict: 'GREAT' | 'PLAYABLE' | 'MARGINAL' | 'SKIP'
  reasons: string[]
  hours: number
}

/**
 * A round is 4-5 hours, so the useful question is whether the WINDOW is good,
 * not whether it is raining right now. The scoring is a documented heuristic,
 * not a sourced standard: start at 100 per hour and deduct for wind above
 * 15 kph, rain probability above 20%, and temperature outside 10-30 C, then
 * average across the window. Tune freely; the shape is what matters.
 */
export function scorePlayability(hours: HourForecast[]): PlayabilityReport {
  if (hours.length === 0) throw new Error('No forecast hours supplied')

  const reasons = new Set<string>()
  let total = 0

  for (const hour of hours) {
    let score = 100

    if (hour.windKph > 15) {
      score -= Math.min((hour.windKph - 15) * 1.5, 40)
      if (hour.windKph > 30) reasons.add('Strong wind')
      else reasons.add('Breezy')
    }
    if (hour.precipProbability > 20) {
      score -= (hour.precipProbability - 20) * 0.6
      if (hour.precipProbability >= 60) reasons.add('Rain likely')
      else reasons.add('Rain possible')
    }
    if (hour.tempC < 10) {
      score -= (10 - hour.tempC) * 2
      reasons.add('Cold')
    } else if (hour.tempC > 30) {
      score -= (hour.tempC - 30) * 2
      reasons.add('Hot')
    }

    total += Math.max(0, score)
  }

  const score = Math.round(total / hours.length)
  const verdict = score >= 75 ? 'GREAT' : score >= 55 ? 'PLAYABLE' : score >= 35 ? 'MARGINAL' : 'SKIP'
  const reasonList = [...reasons]
  if (reasonList.length === 0) reasonList.push('Clear, calm and comfortable')

  return { score, verdict, reasons: reasonList, hours: hours.length }
}
