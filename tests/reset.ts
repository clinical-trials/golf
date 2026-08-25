import { prisma } from '@/lib/db'

/**
 * Deletes every row in foreign-key-safe order. Tests share one database, so
 * each test's beforeEach must fully reset it — cleaning only a subset leaves
 * rows that violate foreign keys when a later test deletes their parents.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.swingClip.deleteMany()
  await prisma.captureSession.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.consentAcceptance.deleteMany()
  await prisma.availabilityException.deleteMany()
  await prisma.availabilityRule.deleteMany()
  await prisma.lessonProduct.deleteMany()
  await prisma.consentDocument.deleteMany()
  await prisma.playerProfile.deleteMany()
  await prisma.pro.deleteMany()
  await prisma.user.deleteMany()
}
