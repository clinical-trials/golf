import type { CoverageGrade } from '@prisma/client'

/**
 * VERIFIED is never derived from geometry. It is only ever set by a human
 * confirming the chart against reality — a played round or a professional
 * review. Every course page states its grade in plain words; a yardage book
 * that quietly guesses is worse than none.
 */
export const COVERAGE_LABELS: Record<CoverageGrade, string> = {
  LISTED: 'We know this course exists but have not charted its holes.',
  ROUTED: 'Hole routing charted from OpenStreetMap. Hazards may be incomplete.',
  DETAILED: 'Holes and hazards charted from OpenStreetMap. Not yet confirmed on the ground.',
  VERIFIED: 'Confirmed against play by a golfer or a professional.',
}
