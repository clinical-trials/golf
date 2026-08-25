import 'dotenv/config'
import { selectStorage } from '@/domain/storage/s3'

export const storage = selectStorage(process.env)
