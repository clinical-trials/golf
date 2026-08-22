import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma client', () => {
  it('connects and answers a trivial query', async () => {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    expect(rows).toEqual([{ ok: 1 }])
  })
})
