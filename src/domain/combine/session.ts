import { prisma } from '@/lib/db'
import type { CaptureSession, Handedness, SwingClip } from '@prisma/client'
import { getRequirement } from './protocol'

export interface RegisterClipInput {
  sessionId: string
  requirementId: string
  swingIndex: number
  storageKey: string
  handedness: Handedness
  durationMs: number
}

export type CaptureSessionWithClips = CaptureSession & { clips: SwingClip[] }

export async function startSession(userId: string): Promise<CaptureSession> {
  return prisma.captureSession.create({ data: { userId } })
}

export async function registerClip(input: RegisterClipInput): Promise<SwingClip> {
  const requirement = getRequirement(input.requirementId)
  if (!requirement) throw new Error(`Unknown requirement id: ${input.requirementId}`)

  if (input.swingIndex < 0 || input.swingIndex >= requirement.swings) {
    throw new Error(
      `Swing index ${input.swingIndex} is out of range for ${requirement.id}, which requires ${requirement.swings} swings`,
    )
  }

  const key = {
    sessionId: input.sessionId,
    requirementId: input.requirementId,
    swingIndex: input.swingIndex,
  }

  return prisma.swingClip.upsert({
    where: { sessionId_requirementId_swingIndex: key },
    update: {
      storageKey: input.storageKey,
      handedness: input.handedness,
      durationMs: input.durationMs,
    },
    create: { ...key, storageKey: input.storageKey, handedness: input.handedness, durationMs: input.durationMs },
  })
}

export async function getSessionWithClips(
  sessionId: string,
): Promise<CaptureSessionWithClips | null> {
  return prisma.captureSession.findUnique({
    where: { id: sessionId },
    include: { clips: { orderBy: [{ requirementId: 'asc' }, { swingIndex: 'asc' }] } },
  })
}
