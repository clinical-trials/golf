export interface UploadTarget {
  url: string
  key: string
  expiresAt: Date
}

export interface StoragePort {
  createUploadUrl(key: string, contentType: string): Promise<UploadTarget>
  exists(key: string): Promise<boolean>
}
