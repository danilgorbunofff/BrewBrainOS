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
import Stripe from 'stripe'
import { stripe, priceIdToTier } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const breweryId = session.metadata?.brewery_id
        const tier = session.metadata?.tier || 'free'
        const whiteGlove = session.metadata?.white_glove === 'true'

        if (!breweryId) break

        // Get the subscription from the session
        const subscriptionId = session.subscription as string

        if (subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as any

          const periodStart = stripeSub.current_period_start || stripeSub.items?.data?.[0]?.current_period_start
          const periodEnd = stripeSub.current_period_end || stripeSub.items?.data?.[0]?.current_period_end

          await supabase.from('subscriptions').upsert(
            {
              brewery_id: breweryId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              tier,
              status: 'active',
              current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
              current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              white_glove_paid: whiteGlove,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'brewery_id' }
          )

          // Sync tier to breweries table for quick lookups
          await supabase
            .from('breweries')
            .update({ subscription_tier: tier })
            .eq('id', breweryId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const breweryId = subscription.metadata?.brewery_id

        if (!breweryId) break

        // Determine the tier from the price
        const priceId = subscription.items?.data?.[0]?.price?.id || ''
        const tier = priceIdToTier(priceId)

        const status = subscription.status === 'active'
          ? 'active'
          : subscription.status === 'past_due'
            ? 'past_due'
            : subscription.status === 'trialing'
              ? 'trialing'
              : 'inactive'

        const periodStart = subscription.current_period_start || subscription.items?.data?.[0]?.current_period_start
        const periodEnd = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end

        await supabase.from('subscriptions').upsert(
          {
            brewery_id: breweryId,
            stripe_subscription_id: subscription.id,
            tier,
            status,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'brewery_id' }
        )

        await supabase
          .from('breweries')
          .update({ subscription_tier: tier })
          .eq('id', breweryId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const breweryId = subscription.metadata?.brewery_id

        if (!breweryId) break

        await supabase.from('subscriptions').upsert(
          {
            brewery_id: breweryId,
            stripe_subscription_id: subscription.id,
            tier: 'free',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'brewery_id' }
        )

        await supabase
          .from('breweries')
          .update({ subscription_tier: 'free' })
          .eq('id', breweryId)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const subscriptionId = (invoice.subscription as string) || invoice.subscription_details?.id

        if (!subscriptionId) break

        // Find brewery by subscription ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('brewery_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single()

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('brewery_id', sub.brewery_id)
        }

        break
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err)
    return new Response('Webhook processing error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
