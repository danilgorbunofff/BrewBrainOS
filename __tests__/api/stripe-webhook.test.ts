import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createServiceRoleClientMock,
  retrieveSubscriptionMock,
  verifyStripeEventMock,
} = vi.hoisted(() => ({
  createServiceRoleClientMock: vi.fn(),
  retrieveSubscriptionMock: vi.fn(),
  verifyStripeEventMock: vi.fn(),
}))

vi.mock('@/lib/with-sentry', () => ({
  withSentry: <TArgs extends unknown[], TResult>(handler: (...args: TArgs) => TResult) => handler,
}))

vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      retrieve: retrieveSubscriptionMock,
    },
  },
  priceIdToTier: (priceId: string) => {
    if (priceId === 'price_production') return 'production'
    if (priceId === 'price_nano') return 'nano'
    if (priceId === 'price_multi_site') return 'multi_site'
    return 'free'
  },
}))

vi.mock('@/lib/stripeWebhook', () => ({
  StripeWebhookSignatureError: class StripeWebhookSignatureError extends Error {},
  verifyStripeEvent: verifyStripeEventMock,
  getCheckoutSessionSubscriptionId: (session: Stripe.Checkout.Session) => {
    if (!session.subscription) {
      return null
    }

    return typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id
  },
  getInvoiceSubscriptionId: (invoice: Stripe.Invoice) => {
    if (!invoice.subscription) {
      return null
    }

    return typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id
  },
  getStripeCustomerId: (
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
  ) => {
    if (!customer) {
      return null
    }

    return typeof customer === 'string' ? customer : customer.id
  },
  getSubscriptionPeriodStart: (subscription: Stripe.Subscription & Record<string, unknown>) => {
    const directValue = subscription.current_period_start

    if (typeof directValue === 'number') {
      return directValue
    }

    const firstItem = subscription.items?.data?.[0] as Record<string, unknown> | undefined
    return typeof firstItem?.current_period_start === 'number' ? firstItem.current_period_start : null
  },
  getSubscriptionPeriodEnd: (subscription: Stripe.Subscription & Record<string, unknown>) => {
    const directValue = subscription.current_period_end

    if (typeof directValue === 'number') {
      return directValue
    }

    const firstItem = subscription.items?.data?.[0] as Record<string, unknown> | undefined
    return typeof firstItem?.current_period_end === 'number' ? firstItem.current_period_end : null
  },
}))

type OperationLog = {
  breweryUpdates: Array<Record<string, unknown>>
  subscriptionUpserts: Array<Record<string, unknown>>
  subscriptionUpdates: Array<Record<string, unknown>>
  webhookUpserts: Array<Record<string, unknown>>
  webhookUpdates: Array<Record<string, unknown>>
}

function createSupabaseMock(options?: {
  existingWebhookRow?: {
    attempts: number | null
    processed_at: string | null
    status: 'failed' | 'processed' | 'processing' | null
    stripe_event_id: string
  } | null
  webhookInsertSucceeds?: boolean
}) {
  const operations: OperationLog = {
    breweryUpdates: [],
    subscriptionUpserts: [],
    subscriptionUpdates: [],
    webhookUpserts: [],
    webhookUpdates: [],
  }

  const existingWebhookRow = options?.existingWebhookRow ?? null
  const webhookInsertSucceeds = options?.webhookInsertSucceeds ?? true

  return {
    client: {
      from(table: string) {
        if (table === 'webhook_events') {
          return {
            upsert(payload: Record<string, unknown>) {
              operations.webhookUpserts.push(payload)

              return {
                select() {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: webhookInsertSucceeds
                        ? {
                            stripe_event_id: payload.stripe_event_id,
                            status: 'processing',
                            attempts: 1,
                            processed_at: null,
                          }
                        : null,
                      error: null,
                    }),
                  }
                },
              }
            },
            select() {
              const query = {
                eq: vi.fn(() => query),
                single: vi.fn().mockResolvedValue({
                  data: existingWebhookRow,
                  error: existingWebhookRow ? null : { message: 'not found' },
                }),
              }

              return query
            },
            update(payload: Record<string, unknown>) {
              operations.webhookUpdates.push(payload)

              const query = {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }

              return query
            },
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert(payload: Record<string, unknown>) {
              operations.subscriptionUpserts.push(payload)
              return Promise.resolve({ data: null, error: null })
            },
            update(payload: Record<string, unknown>) {
              operations.subscriptionUpdates.push(payload)

              const query = {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }

              return query
            },
            select() {
              const query = {
                eq: vi.fn(() => query),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }

              return query
            },
          }
        }

        if (table === 'breweries') {
          return {
            update(payload: Record<string, unknown>) {
              operations.breweryUpdates.push(payload)

              const query = {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }

              return query
            },
          }
        }

        throw new Error(`Unexpected table lookup: ${table}`)
      },
    },
    operations,
  }
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('processes checkout.session.completed once and marks the webhook row processed', async () => {
    const supabase = createSupabaseMock()
    const event = {
      id: 'evt_checkout_complete',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_123',
          metadata: {
            brewery_id: 'brewery_123',
            tier: 'production',
            white_glove: 'true',
          },
          subscription: 'sub_123',
        },
      },
    } as unknown as Stripe.Event

    verifyStripeEventMock.mockResolvedValue({
      event,
      payload: { id: 'evt_checkout_complete' },
      rawBody: Buffer.from('{"id":"evt_checkout_complete"}'),
    })
    retrieveSubscriptionMock.mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      current_period_start: 1712448000,
      current_period_end: 1715040000,
      items: {
        data: [
          {
            price: {
              id: 'price_production',
            },
          },
        ],
      },
      metadata: {
        brewery_id: 'brewery_123',
      },
      status: 'active',
    } as unknown as Stripe.Subscription)
    createServiceRoleClientMock.mockReturnValue(supabase.client)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const response = await POST(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=test',
      },
      body: JSON.stringify({ id: 'evt_checkout_complete' }),
    }) as NextRequest)

    expect(response.status).toBe(200)
    expect(supabase.operations.webhookUpserts).toHaveLength(1)
    expect(supabase.operations.subscriptionUpserts).toEqual([
      expect.objectContaining({
        brewery_id: 'brewery_123',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        tier: 'production',
        status: 'active',
        white_glove_paid: true,
      }),
    ])
    expect(supabase.operations.breweryUpdates).toEqual([
      { subscription_tier: 'production' },
    ])
    expect(supabase.operations.webhookUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'processed' }),
      ])
    )
  })

  it('returns 200 for an already processed duplicate event without re-running business logic', async () => {
    const supabase = createSupabaseMock({
      existingWebhookRow: {
        stripe_event_id: 'evt_duplicate',
        status: 'processed',
        attempts: 1,
        processed_at: '2026-04-07T12:00:00.000Z',
      },
      webhookInsertSucceeds: false,
    })

    verifyStripeEventMock.mockResolvedValue({
      event: {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: {
          object: {},
        },
      } as Stripe.Event,
      payload: { id: 'evt_duplicate' },
      rawBody: Buffer.from('{"id":"evt_duplicate"}'),
    })
    createServiceRoleClientMock.mockReturnValue(supabase.client)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const response = await POST(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=test',
      },
      body: JSON.stringify({ id: 'evt_duplicate' }),
    }) as NextRequest)

    expect(response.status).toBe(200)
    expect(supabase.operations.subscriptionUpserts).toHaveLength(0)
    expect(supabase.operations.breweryUpdates).toHaveLength(0)
  })

  it('marks the webhook row failed and returns 500 when processing throws', async () => {
    const supabase = createSupabaseMock()
    const event = {
      id: 'evt_processing_failure',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_123',
          metadata: {
            brewery_id: 'brewery_123',
            tier: 'production',
          },
          subscription: 'sub_123',
        },
      },
    } as unknown as Stripe.Event

    verifyStripeEventMock.mockResolvedValue({
      event,
      payload: { id: 'evt_processing_failure' },
      rawBody: Buffer.from('{"id":"evt_processing_failure"}'),
    })
    retrieveSubscriptionMock.mockRejectedValue(new Error('Stripe is down'))
    createServiceRoleClientMock.mockReturnValue(supabase.client)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const response = await POST(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=test',
      },
      body: JSON.stringify({ id: 'evt_processing_failure' }),
    }) as NextRequest)

    expect(response.status).toBe(500)
    expect(supabase.operations.webhookUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'failed' }),
      ])
    )
  })
})