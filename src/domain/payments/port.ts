export type PaymentProvider = 'STUB' | 'STRIPE'

export interface CreateIntentInput {
  amountMinor: number
  currency: string
  description: string
  metadata?: Record<string, string>
}

export interface PaymentIntentResult {
  reference: string
  clientSecret: string | null
  provider: PaymentProvider
}

export interface PaymentOutcome {
  reference: string
  status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
  message: string
}

export interface PaymentPort {
  readonly provider: PaymentProvider
  createIntent(input: CreateIntentInput): Promise<PaymentIntentResult>
  capture(reference: string): Promise<PaymentOutcome>
  refund(reference: string): Promise<PaymentOutcome>
}

export function assertValidAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Amount must be an integer in minor units, for example 12000 for $120.00')
  }
  if (amountMinor <= 0) {
    throw new Error('Amount must be positive')
  }
}
