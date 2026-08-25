import { describe, it, expect } from 'vitest'
import { InMemoryStorage } from '@/domain/storage/memory'

describe('in-memory storage', () => {
  it('issues an upload target for a key', async () => {
    const storage = new InMemoryStorage()
    const target = await storage.createUploadUrl('clips/a.mp4', 'video/mp4')
    expect(target.key).toBe('clips/a.mp4')
    expect(target.url).toContain('clips/a.mp4')
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('reports a key as absent until it is uploaded', async () => {
    const storage = new InMemoryStorage()
    await storage.createUploadUrl('clips/b.mp4', 'video/mp4')
    expect(await storage.exists('clips/b.mp4')).toBe(false)
    storage.markUploaded('clips/b.mp4')
    expect(await storage.exists('clips/b.mp4')).toBe(true)
  })
})
