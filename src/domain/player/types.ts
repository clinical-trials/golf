export type {
  Handedness,
  AgeBand,
  PracticeAccess,
  PrimaryGoal,
  LearningStyle,
  SkillDomain,
  PlayerProfile,
} from '@prisma/client'

import type { Handedness, AgeBand, PracticeAccess, PrimaryGoal } from '@prisma/client'

export interface CreatePlayerProfileInput {
  userId: string
  handedness: Handedness
  ageBand: AgeBand
  practiceAccess: PracticeAccess
  primaryGoal: PrimaryGoal
  language: string
}
