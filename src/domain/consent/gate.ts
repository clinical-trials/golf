import { prisma } from '@/lib/db'
import type { ConsentKind } from '@prisma/client'
import { listRequiredDocuments } from './documents'

export function isMinor(dateOfBirth: Date | null, now: Date = new Date()): boolean {
  if (!dateOfBirth) return false
  const eighteenth = new Date(dateOfBirth)
  eighteenth.setFullYear(eighteenth.getFullYear() + 18)
  return now < eighteenth
}

export async function missingRequiredConsents(userId: string): Promise<ConsentKind[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const required = await listRequiredDocuments({ isMinor: isMinor(user.dateOfBirth) })

  const accepted = await prisma.consentAcceptance.findMany({
    where: { userId, documentId: { in: required.map((d) => d.id) } },
    select: { documentId: true },
  })
  const acceptedIds = new Set(accepted.map((a) => a.documentId))

  return required.filter((d) => !acceptedIds.has(d.id)).map((d) => d.kind)
}

export async function hasSecondaryUseConsent(userId: string): Promise<boolean> {
  const count = await prisma.consentAcceptance.count({
    where: { userId, document: { kind: 'SECONDARY_USE' } },
  })
  return count > 0
}
