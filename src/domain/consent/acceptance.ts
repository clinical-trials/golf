import { prisma } from '@/lib/db'
import type { ConsentAcceptance, ConsentKind } from '@prisma/client'
import { getCurrentDocument } from './documents'

export interface RecordAcceptanceInput {
  userId: string
  kind: ConsentKind
  ipAddress?: string
  userAgent?: string
  acceptedByUserId?: string
}

export async function recordAcceptance(
  input: RecordAcceptanceInput,
): Promise<ConsentAcceptance> {
  const doc = await getCurrentDocument(input.kind)

  const existing = await prisma.consentAcceptance.findUnique({
    where: { userId_documentId: { userId: input.userId, documentId: doc.id } },
  })
  if (existing) return existing

  return prisma.consentAcceptance.create({
    data: {
      userId: input.userId,
      documentId: doc.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      acceptedByUserId: input.acceptedByUserId,
    },
  })
}

export async function listAcceptances(userId: string): Promise<ConsentAcceptance[]> {
  return prisma.consentAcceptance.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'asc' },
  })
}
