import { prisma } from '@/lib/db'
import type { CreatePlayerProfileInput, PlayerProfile, SkillDomain } from './types'

export async function createPlayerProfile(
  input: CreatePlayerProfileInput,
): Promise<PlayerProfile> {
  return prisma.playerProfile.create({ data: input })
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  return prisma.playerProfile.findUnique({ where: { userId } })
}

export interface DomainAssessment {
  level: number
  confidence: number
}

/**
 * Records a per-domain skill level from the Video Combine. Levels are 0-54
 * handicap-equivalent bands; confidence is 0..1 and reflects that video reads
 * mechanics, not scoring, so it must not be presented as a measured handicap.
 */
export async function setDomainLevel(
  userId: string,
  domain: SkillDomain,
  assessment: DomainAssessment,
): Promise<PlayerProfile> {
  if (assessment.level < 0 || assessment.level > 54) {
    throw new Error(`level must be between 0 and 54, received ${assessment.level}`)
  }
  if (assessment.confidence < 0 || assessment.confidence > 1) {
    throw new Error(`confidence must be between 0 and 1, received ${assessment.confidence}`)
  }

  const column = {
    FULL_SWING: { fullSwingLevel: assessment.level, fullSwingConfidence: assessment.confidence },
    SHORT_GAME: { shortGameLevel: assessment.level, shortGameConfidence: assessment.confidence },
    PUTTING: { puttingLevel: assessment.level, puttingConfidence: assessment.confidence },
  }[domain]

  return prisma.playerProfile.update({ where: { userId }, data: column })
}
