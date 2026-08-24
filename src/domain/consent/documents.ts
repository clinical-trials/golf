import { prisma } from '@/lib/db'
import type { ConsentDocument, ConsentKind } from '@prisma/client'

export async function getCurrentDocument(kind: ConsentKind): Promise<ConsentDocument> {
  const doc = await prisma.consentDocument.findFirst({
    where: { kind },
    orderBy: { version: 'desc' },
  })
  if (!doc) throw new Error(`No consent document exists for kind ${kind}`)
  return doc
}

export async function listRequiredDocuments(opts: {
  isMinor: boolean
}): Promise<ConsentDocument[]> {
  const docs = await prisma.consentDocument.findMany({
    where: { required: true },
    orderBy: [{ kind: 'asc' }, { version: 'desc' }],
    distinct: ['kind'],
  })
  return opts.isMinor ? docs : docs.filter((d) => d.kind !== 'MINOR_PARENTAL')
}
