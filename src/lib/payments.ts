import 'dotenv/config'
import { selectPaymentPort } from '@/domain/payments/stripe'

export const payments = selectPaymentPort(process.env)
