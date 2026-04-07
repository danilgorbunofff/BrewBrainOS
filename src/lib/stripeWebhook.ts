import { Buffer } from 'node:buffer'

import { NextRequest } from 'next/server'
import Stripe from 'stripe'

import { stripe } from '@/lib/stripe'

export class StripeWebhookSignatureError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StripeWebhookSignatureError'
  }
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    throw new StripeWebhookSignatureError('Missing STRIPE_WEBHOOK_SECRET')
  }

  return secret
}

export async function verifyStripeEvent(request: NextRequest): Promise<{
  event: Stripe.Event
  payload: unknown
  rawBody: Buffer
}> {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    throw new StripeWebhookSignatureError('Missing stripe-signature header')
  }

  const rawBody = Buffer.from(await request.arrayBuffer())

  try {
    return {
      event: stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret()),
      payload: JSON.parse(rawBody.toString('utf8')),
      rawBody,
    }
  } catch (error) {
    throw new StripeWebhookSignatureError('Webhook signature verification failed', {
      cause: error,
    })
  }
}

export function getCheckoutSessionSubscriptionId(session: Stripe.Checkout.Session) {
  if (!session.subscription) {
    return null
  }

  return typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription

  if (!subscription) {
    return null
  }

  return typeof subscription === 'string'
    ? subscription
    : subscription.id
}

export function getSubscriptionPeriodStart(subscription: Stripe.Subscription) {
  if (typeof (subscription as Stripe.Subscription & { current_period_start?: unknown }).current_period_start === 'number') {
    return (subscription as Stripe.Subscription & { current_period_start: number }).current_period_start
  }

  const periodStarts = subscription.items.data
    .map((item) => item.current_period_start)
    .filter((value): value is number => typeof value === 'number')

  if (periodStarts.length === 0) {
    return null
  }

  return Math.min(...periodStarts)
}

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  if (typeof (subscription as Stripe.Subscription & { current_period_end?: unknown }).current_period_end === 'number') {
    return (subscription as Stripe.Subscription & { current_period_end: number }).current_period_end
  }

  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number')

  if (periodEnds.length === 0) {
    return null
  }

  return Math.max(...periodEnds)
}

export function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
) {
  if (!customer) {
    return null
  }

  return typeof customer === 'string' ? customer : customer.id
}