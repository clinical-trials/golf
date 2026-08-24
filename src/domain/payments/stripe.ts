import type { PaymentPort } from './port'
import { StubPayments } from './stub'

/**
 * Stripe when a key is configured, the stub otherwise. Adding credentials is
 * the only step needed to take real payments — no code changes.
 *
 * The Stripe SDK is imported lazily so the package is only required when a key
 * is actually present. Until then the stub runs and `stripe` need not be
 * installed for tests to pass.
 */
export function selectPaymentPort(env: Record<string, string | undefined>): PaymentPort {
  const key = env.STRIPE_SECRET_KEY?.trim()
  if (!key) return new StubPayments()
  return new StripePayments(key)
}

export class StripePayments implements PaymentPort {
  readonly provider = 'STRIPE' as const

  private secretKey: string
  private client: unknown | null = null

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  private async stripe(): Promise<any> {
    if (this.client) return this.client
    // Lazy import: only load the SDK when real payments are configured.
    const mod = await import('stripe').catch(() => {
      throw new Error('The `stripe` package is not installed. Run `pnpm add stripe` to enable live payments.')
    })
    const Stripe = (mod as any).default ?? mod
    this.client = new Stripe(this.secretKey)
    return this.client
  }

  async createIntent(input: {
    amountMinor: number
    currency: string
    description: string
    metadata?: Record<string, string>
  }) {
    const client = await this.stripe()
    const intent = await client.paymentIntents.create({
      amount: input.amountMinor,
      currency: input.currency,
      description: input.description,
      metadata: input.metadata,
      capture_method: 'manual',
    })
    return { reference: intent.id, clientSecret: intent.client_secret, provider: this.provider }
  }

  async capture(reference: string) {
    const client = await this.stripe()
    const intent = await client.paymentIntents.capture(reference)
    return {
      reference,
      status: (intent.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED') as 'SUCCEEDED' | 'FAILED',
      message: `Stripe payment intent ${intent.status}`,
    }
  }

  async refund(reference: string) {
    const client = await this.stripe()
    const refund = await client.refunds.create({ payment_intent: reference })
    return {
      reference,
      status: (refund.status === 'succeeded' ? 'REFUNDED' : 'FAILED') as 'REFUNDED' | 'FAILED',
      message: `Stripe refund ${refund.status}`,
    }
  }
}
