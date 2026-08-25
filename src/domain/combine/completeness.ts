import type { SkillDomain } from '@prisma/client'
import { COMBINE_PROTOCOL } from './protocol'

export interface ClipSummary {
  requirementId: string
  swingIndex: number
}

export interface MissingShot {
  requirementId: string
  missingSwings: number[]
}

export interface CompletenessReport {
  complete: boolean
  totalRequired: number
  totalCaptured: number
  missing: MissingShot[]
  completeDomains: SkillDomain[]
}

export function evaluateSessionCompleteness(clips: ClipSummary[]): CompletenessReport {
  const captured = new Map<string, Set<number>>()
  for (const clip of clips) {
    if (!captured.has(clip.requirementId)) captured.set(clip.requirementId, new Set())
    captured.get(clip.requirementId)!.add(clip.swingIndex)
  }

  const missing: MissingShot[] = []
  let totalRequired = 0
  let totalCaptured = 0

  for (const requirement of COMBINE_PROTOCOL) {
    totalRequired += requirement.swings
    const have = captured.get(requirement.id) ?? new Set<number>()

    const missingSwings: number[] = []
    for (let i = 0; i < requirement.swings; i++) {
      if (have.has(i)) totalCaptured++
      else missingSwings.push(i)
    }
    if (missingSwings.length > 0) missing.push({ requirementId: requirement.id, missingSwings })
  }

  const incompleteDomains = new Set(
    missing.map((m) => COMBINE_PROTOCOL.find((r) => r.id === m.requirementId)!.domain),
  )
  const completeDomains = [...new Set(COMBINE_PROTOCOL.map((r) => r.domain))]
    .filter((d) => !incompleteDomains.has(d))
    .sort()

  return { complete: missing.length === 0, totalRequired, totalCaptured, missing, completeDomains }
}
