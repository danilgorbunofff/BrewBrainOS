import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { constructEventMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}))

describe('stripeWebhook helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('verifies the event using the raw request body', async () => {
    const event = {
      id: 'evt_verified',
      type: 'checkout.session.completed',
    } as Stripe.Event

    constructEventMock.mockReturnValue(event)

    const { verifyStripeEvent } = await import('@/lib/stripeWebhook')
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=test-signature',
      },
      body: JSON.stringify({ id: 'evt_verified', object: 'event' }),
    })

    const result = await verifyStripeEvent(request as NextRequest)

    expect(result.event).toBe(event)
    expect(result.payload).toEqual({ id: 'evt_verified', object: 'event' })
    expect(Buffer.isBuffer(result.rawBody)).toBe(true)
    expect(constructEventMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      't=1,v1=test-signature',
      'whsec_test'
    )
  })

  it('rejects requests without a Stripe signature header', async () => {
    const { StripeWebhookSignatureError, verifyStripeEvent } = await import('@/lib/stripeWebhook')
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_missing_header' }),
    })
    const verification = verifyStripeEvent(request as NextRequest)

    await expect(verification).rejects.toBeInstanceOf(
      StripeWebhookSignatureError
    )
    await expect(verification).rejects.toThrow(
      'Missing stripe-signature header'
    )
  })

  it('wraps constructEvent failures as signature errors', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('bad signature')
    })

    const { StripeWebhookSignatureError, verifyStripeEvent } = await import('@/lib/stripeWebhook')
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=bad-signature',
      },
      body: JSON.stringify({ id: 'evt_bad_signature' }),
    })
    const verification = verifyStripeEvent(request as NextRequest)

    await expect(verification).rejects.toBeInstanceOf(
      StripeWebhookSignatureError
    )
    await expect(verification).rejects.toThrow(
      'Webhook signature verification failed'
    )
  })

  it('rejects requests when the webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const event = {
      id: 'evt_missing_secret',
      type: 'checkout.session.completed',
    } as Stripe.Event

    constructEventMock.mockReturnValue(event)

    const { StripeWebhookSignatureError, verifyStripeEvent } = await import('@/lib/stripeWebhook')
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=test-signature',
      },
      body: JSON.stringify({ id: 'evt_missing_secret' }),
    })

    await expect(verifyStripeEvent(request as NextRequest)).rejects.toBeInstanceOf(
      StripeWebhookSignatureError
    )
  })

  it('extracts Stripe identifiers from checkout sessions, invoices, and customers', async () => {
    const {
      getCheckoutSessionSubscriptionId,
      getInvoiceSubscriptionId,
      getStripeCustomerId,
    } = await import('@/lib/stripeWebhook')

    expect(getCheckoutSessionSubscriptionId({ subscription: 'sub_checkout' } as Stripe.Checkout.Session)).toBe('sub_checkout')
    expect(getCheckoutSessionSubscriptionId({ subscription: { id: 'sub_embedded' } } as Stripe.Checkout.Session)).toBe('sub_embedded')
    expect(getCheckoutSessionSubscriptionId({ subscription: null } as Stripe.Checkout.Session)).toBeNull()

    expect(getInvoiceSubscriptionId({
      parent: {
        subscription_details: {
          subscription: 'sub_invoice',
        },
      },
    } as Stripe.Invoice)).toBe('sub_invoice')
    expect(getInvoiceSubscriptionId({ parent: null } as Stripe.Invoice)).toBeNull()

    expect(getStripeCustomerId('cus_string')).toBe('cus_string')
    expect(getStripeCustomerId({ id: 'cus_object' } as Stripe.Customer)).toBe('cus_object')
    expect(getStripeCustomerId(null)).toBeNull()
  })

  it('reads subscription periods from direct fields and line items', async () => {
    const { getSubscriptionPeriodEnd, getSubscriptionPeriodStart } = await import('@/lib/stripeWebhook')

    expect(getSubscriptionPeriodStart({
      current_period_start: 1712448000,
      items: { data: [] },
    } as unknown as Stripe.Subscription)).toBe(1712448000)
    expect(getSubscriptionPeriodEnd({
      current_period_end: 1715040000,
      items: { data: [] },
    } as unknown as Stripe.Subscription)).toBe(1715040000)

    expect(getSubscriptionPeriodStart({
      items: {
        data: [
          { current_period_start: 12 },
          { current_period_start: 4 },
        ],
      },
    } as unknown as Stripe.Subscription)).toBe(4)
    expect(getSubscriptionPeriodEnd({
      items: {
        data: [
          { current_period_end: 10 },
          { current_period_end: 22 },
        ],
      },
    } as unknown as Stripe.Subscription)).toBe(22)
    expect(getSubscriptionPeriodStart({ items: { data: [] } } as unknown as Stripe.Subscription)).toBeNull()
  })
})