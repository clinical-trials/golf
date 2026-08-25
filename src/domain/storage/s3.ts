import type { StoragePort, UploadTarget } from './port'
import { InMemoryStorage } from './memory'

const EXPIRY_SECONDS = 15 * 60

/**
 * S3-backed StoragePort. The AWS SDK is imported lazily so the package is only
 * required when object storage is actually configured; until then the app runs
 * on the in-memory store, the same pattern as Stripe vs the payment stub.
 */
export class S3Storage implements StoragePort {
  private clientPromise: Promise<any> | null = null

  constructor(private readonly bucket: string, private readonly region: string) {}

  private async client(): Promise<{ s3: any; presign: any; commands: any }> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const s3mod = await import('@aws-sdk/client-s3').catch(() => {
          throw new Error('@aws-sdk/client-s3 is not installed. Run `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.')
        })
        const presignMod = await import('@aws-sdk/s3-request-presigner')
        const client = new (s3mod as any).S3Client({ region: this.region })
        return { s3: client, presign: (presignMod as any).getSignedUrl, commands: s3mod }
      })()
    }
    return this.clientPromise
  }

  async createUploadUrl(key: string, contentType: string): Promise<UploadTarget> {
    const { s3, presign, commands } = await this.client()
    const command = new commands.PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    const url = await presign(s3, command, { expiresIn: EXPIRY_SECONDS })
    return { url, key, expiresAt: new Date(Date.now() + EXPIRY_SECONDS * 1000) }
  }

  async exists(key: string): Promise<boolean> {
    const { s3, commands } = await this.client()
    try {
      await s3.send(new commands.HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }
}

/** S3 when a bucket is configured, the in-memory store otherwise. */
export function selectStorage(env: Record<string, string | undefined>): StoragePort {
  const bucket = env.CLIP_BUCKET?.trim()
  if (!bucket) return new InMemoryStorage()
  return new S3Storage(bucket, env.AWS_REGION?.trim() || 'us-east-1')
}
