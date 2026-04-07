/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events to sync subscription state.
 *
 * Events handled:
 * - checkout.session.completed  → Activate subscription
 * - customer.subscription.updated → Sync tier/status changes
 * - customer.subscription.deleted → Mark canceled
 * - invoice.payment_failed → Mark past_due
 */

import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe, priceIdToTier } from '@/lib/stripe'
import {
  getCheckoutSessionSubscriptionId,
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
  getSubscriptionPeriodStart,
  getStripeCustomerId,
  StripeWebhookSignatureError,
  verifyStripeEvent,
} from '@/lib/stripeWebhook'
import { withSentry } from '@/lib/with-sentry'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export const runtime = 'nodejs'

type WebhookEventStatus = 'failed' | 'processed' | 'processing'

type WebhookEventRow = {
  attempts: number | null
  processed_at: string | null
  status: WebhookEventStatus | null
  stripe_event_id: string
}

const WEBHOOK_EVENTS_TABLE = 'webhook_events'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getBillingStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    default:
      return 'inactive'
  }
}

function toIsoTimestamp(timestamp: number | null | undefined) {
  return typeof timestamp === 'number'
    ? new Date(timestamp * 1000).toISOString()
    : null
}

async function claimWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  payload: unknown
) {
  const { data: insertedRow, error: insertError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .upsert(
      {
        stripe_event_id: eventId,
        status: 'processing',
        attempts: 1,
        payload,
      },
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    )
    .select('stripe_event_id, status, attempts, processed_at')
    .maybeSingle<WebhookEventRow>()

  if (insertError) {
    throw new Error(`Failed to record webhook event: ${insertError.message}`)
  }

  if (insertedRow) {
    return 'claimed' as const
  }

  const { data: existingRow, error: selectError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .select('stripe_event_id, status, attempts, processed_at')
    .eq('stripe_event_id', eventId)
    .single<WebhookEventRow>()

  if (selectError || !existingRow) {
    throw new Error(`Failed to load webhook event state: ${selectError?.message || 'missing row'}`)
  }

  if (existingRow.status === 'processed' || existingRow.processed_at) {
    return 'already-processed' as const
  }

  if (existingRow.status === 'failed') {
    const { error: retryError } = await supabase
      .from(WEBHOOK_EVENTS_TABLE)
      .update({
        status: 'processing',
        attempts: (existingRow.attempts ?? 0) + 1,
        payload,
        processed_at: null,
      })
      .eq('stripe_event_id', eventId)

    if (retryError) {
      throw new Error(`Failed to retry webhook event: ${retryError.message}`)
    }

    return 'claimed' as const
  }

  return 'in-progress' as const
}

async function markWebhookEventProcessed(supabase: SupabaseClient, eventId: string) {
  const { error } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', eventId)

  if (error) {
    throw new Error(`Failed to mark webhook event processed: ${error.message}`)
  }
}

async function markWebhookEventFailed(
  supabase: SupabaseClient,
  eventId: string,
  errorMessage: string
) {
  const { error } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .update({
      status: 'failed',
      payload: {
        error: errorMessage,
      },
    })
    .eq('stripe_event_id', eventId)

  if (error) {
    console.error('[Stripe Webhook] Failed to mark event failed:', error)
  }
}

async function resolveBreweryIdForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const metadataBreweryId = subscription.metadata?.brewery_id

  if (metadataBreweryId) {
    return metadataBreweryId
  }

  const { data: bySubscription } = await supabase
    .from('subscriptions')
    .select('brewery_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle<{ brewery_id: string }>()

  if (bySubscription?.brewery_id) {
    return bySubscription.brewery_id
  }

  const customerId = getStripeCustomerId(subscription.customer)

  if (!customerId) {
    return null
  }

  const { data: byCustomer } = await supabase
    .from('subscriptions')
    .select('brewery_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle<{ brewery_id: string }>()

  return byCustomer?.brewery_id ?? null
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const subscriptionId = getCheckoutSessionSubscriptionId(session)

  if (!subscriptionId) {
    return
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const breweryId =
    session.metadata?.brewery_id ||
    stripeSubscription.metadata?.brewery_id ||
    await resolveBreweryIdForSubscription(supabase, stripeSubscription)

  if (!breweryId) {
    return
  }

  const priceId = stripeSubscription.items.data[0]?.price?.id ?? ''
  const tier = session.metadata?.tier || priceIdToTier(priceId)
  const customerId = getStripeCustomerId(session.customer) || getStripeCustomerId(stripeSubscription.customer)

  await supabase.from('subscriptions').upsert(
    {
      brewery_id: breweryId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      tier,
      status: 'active',
      current_period_start: toIsoTimestamp(getSubscriptionPeriodStart(stripeSubscription)),
      current_period_end: toIsoTimestamp(getSubscriptionPeriodEnd(stripeSubscription)),
      white_glove_paid: session.metadata?.white_glove === 'true',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brewery_id' }
  )

  await supabase
    .from('breweries')
    .update({ subscription_tier: tier })
    .eq('id', breweryId)
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const breweryId = await resolveBreweryIdForSubscription(supabase, subscription)

  if (!breweryId) {
    return
  }

  const tier = priceIdToTier(subscription.items.data[0]?.price?.id ?? '')

  await supabase.from('subscriptions').upsert(
    {
      brewery_id: breweryId,
      stripe_customer_id: getStripeCustomerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      tier,
      status: getBillingStatus(subscription.status),
      current_period_start: toIsoTimestamp(getSubscriptionPeriodStart(subscription)),
      current_period_end: toIsoTimestamp(getSubscriptionPeriodEnd(subscription)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brewery_id' }
  )

  await supabase
    .from('breweries')
    .update({ subscription_tier: tier })
    .eq('id', breweryId)
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const breweryId = await resolveBreweryIdForSubscription(supabase, subscription)

  if (!breweryId) {
    return
  }

  await supabase.from('subscriptions').upsert(
    {
      brewery_id: breweryId,
      stripe_customer_id: getStripeCustomerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      tier: 'free',
      status: 'canceled',
      current_period_start: null,
      current_period_end: toIsoTimestamp(getSubscriptionPeriodEnd(subscription)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brewery_id' }
  )

  await supabase
    .from('breweries')
    .update({ subscription_tier: 'free' })
    .eq('id', breweryId)
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) {
    return
  }

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)
}

async function processStripeEvent(supabase: SupabaseClient, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(
        supabase,
        event.data.object as Stripe.Checkout.Session
      )
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(
        supabase,
        event.data.object as Stripe.Subscription
      )
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(
        supabase,
        event.data.object as Stripe.Subscription
      )
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(
        supabase,
        event.data.object as Stripe.Invoice
      )
      break

    default:
      break
  }
}

export const POST = withSentry(async (request: NextRequest) => {
  let verifiedEvent: Awaited<ReturnType<typeof verifyStripeEvent>>

  try {
    verifiedEvent = await verifyStripeEvent(request)
  } catch (error) {
    if (error instanceof StripeWebhookSignatureError) {
      return new Response(error.message, { status: 400 })
    }

    throw error
  }

  const { event, payload } = verifiedEvent
  const supabase = createServiceRoleClient()
  const claimStatus = await claimWebhookEvent(supabase, event.id, payload)

  if (claimStatus === 'already-processed') {
    return Response.json({ duplicate: true, received: true }, { status: 200 })
  }

  if (claimStatus === 'in-progress') {
    return new Response('Webhook already processing', { status: 500 })
  }

  try {
    await processStripeEvent(supabase, event)
    await markWebhookEventProcessed(supabase, event.id)
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    await markWebhookEventFailed(supabase, event.id, errorMessage)
    console.error('[Stripe Webhook] Processing error:', error)
    return new Response('Webhook processing error', { status: 500 })
  }

  return Response.json({ received: true }, { status: 200 })
}, {
  name: 'api/stripe/webhook',
  onError: () => new Response('Webhook processing error', { status: 500 }),
})
