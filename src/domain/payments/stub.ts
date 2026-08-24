import { assertValidAmount } from './port'
import type { CreateIntentInput, PaymentIntentResult, PaymentOutcome, PaymentPort } from './port'

/**
 * Takes no money and pretends nothing. Every reference is prefixed `stub_` and
 * every outcome says so in plain words, so a stub booking can never be mistaken
 * for revenue in a report.
 */
export class StubPayments implements PaymentPort {
  readonly provider = 'STUB' as const

  private issued = new Map<string, CreateIntentInput>()
  private counter = 0

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    assertValidAmount(input.amountMinor)
    const reference = `stub_${++this.counter}_${input.amountMinor}${input.currency}`
    this.issued.set(reference, input)
    return { reference, clientSecret: null, provider: this.provider }
  }

  async capture(reference: string): Promise<PaymentOutcome> {
    if (!this.issued.has(reference)) throw new Error(`Unknown payment reference ${reference}`)
    return { reference, status: 'SUCCEEDED', message: 'Stub payment — no money moved' }
  }

  async refund(reference: string): Promise<PaymentOutcome> {
    if (!this.issued.has(reference)) throw new Error(`Unknown payment reference ${reference}`)
    return { reference, status: 'REFUNDED', message: 'Stub refund — no money moved' }
  }
}
