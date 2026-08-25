import type { StoragePort, UploadTarget } from './port'

/**
 * In-memory StoragePort for tests. Issues fake upload URLs and only reports a
 * key as present after markUploaded is called, so tests can simulate the gap
 * between "URL issued" and "file actually uploaded".
 */
export class InMemoryStorage implements StoragePort {
  private uploaded = new Set<string>()

  async createUploadUrl(key: string, _contentType: string): Promise<UploadTarget> {
    return {
      url: `memory://upload/${key}`,
      key,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.uploaded.has(key)
  }

  markUploaded(key: string): void {
    this.uploaded.add(key)
  }
}
