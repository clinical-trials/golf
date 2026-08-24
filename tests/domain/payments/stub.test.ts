import { describe, it, expect } from 'vitest'
import { StubPayments } from '@/domain/payments/stub'
import { selectPaymentPort } from '@/domain/payments/stripe'

describe('stub payments', () => {
  it('identifies itself as the stub provider', () => {
    expect(new StubPayments().provider).toBe('STUB')
  })

  it('returns a reference that is obviously not a real charge', async () => {
    const intent = await new StubPayments().createIntent({
      amountMinor: 12000, currency: 'usd', description: 'One hour lesson',
    })
    expect(intent.reference).toMatch(/^stub_/)
    expect(intent.provider).toBe('STUB')
    expect(intent.clientSecret).toBeNull()
  })

  it('rejects a non-integer amount', async () => {
    await expect(
      new StubPayments().createIntent({ amountMinor: 120.5, currency: 'usd', description: 'x' }),
    ).rejects.toThrow(/minor units/i)
  })

  it('rejects a zero or negative amount', async () => {
    await expect(
      new StubPayments().createIntent({ amountMinor: 0, currency: 'usd', description: 'x' }),
    ).rejects.toThrow(/positive/i)
  })

  it('captures and refunds a reference it issued', async () => {
    const payments = new StubPayments()
    const intent = await payments.createIntent({ amountMinor: 12000, currency: 'usd', description: 'x' })

    const captured = await payments.capture(intent.reference)
    expect(captured.status).toBe('SUCCEEDED')
    expect(captured.message).toMatch(/no money/i)

    const refunded = await payments.refund(intent.reference)
    expect(refunded.status).toBe('REFUNDED')
  })

  it('refuses to capture a reference it never issued', async () => {
    await expect(new StubPayments().capture('stub_nope')).rejects.toThrow(/unknown/i)
  })
})

describe('payment port selection', () => {
  it('uses the stub when no Stripe key is configured', () => {
    expect(selectPaymentPort({}).provider).toBe('STUB')
  })

  it('uses the stub when the key is blank', () => {
    expect(selectPaymentPort({ STRIPE_SECRET_KEY: '   ' }).provider).toBe('STUB')
  })

  it('uses Stripe once a key is present', () => {
    expect(selectPaymentPort({ STRIPE_SECRET_KEY: 'sk_test_example' }).provider).toBe('STRIPE')
  })
})
