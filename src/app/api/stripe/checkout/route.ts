/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for the selected tier.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { createStripeIdempotencyKey } from '@/lib/stripeIdempotency'
import { getStripePriceId, getWhiteGlovePriceId } from '@/lib/tier-config'
import type { TierSlug, BillingInterval } from '@/lib/tier-config'
import { getActiveBrewery } from '@/lib/active-brewery'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brewery = await getActiveBrewery()

    if (!brewery) {
      return Response.json({ error: 'No brewery found' }, { status: 404 })
    }

    const body = await request.json()
    const tier = body.tier as TierSlug
    const billingInterval: BillingInterval = body.billingInterval === 'annual' ? 'annual' : 'monthly'
    const includeWhiteGlove = body.includeWhiteGlove === true

    const priceId = getStripePriceId(tier, billingInterval)
    if (!priceId) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const customerId = await getOrCreateStripeCustomer(
      brewery.id,
      user.email || ''
    )

    // Build line items
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ]

    // Add White Glove setup fee if requested
    if (includeWhiteGlove) {
      const whiteGlovePrice = getWhiteGlovePriceId()
      if (whiteGlovePrice) {
        lineItems.push({ price: whiteGlovePrice, quantity: 1 })
      }
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const requestIdempotencyKey = request.headers.get('x-idempotency-key')

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        brewery_id: brewery.id,
        tier,
        billing_interval: billingInterval,
        white_glove: includeWhiteGlove ? 'true' : 'false',
      },
      subscription_data: {
        metadata: {
          brewery_id: brewery.id,
          tier,
          billing_interval: billingInterval,
        },
      },
    }, {
      idempotencyKey: requestIdempotencyKey || createStripeIdempotencyKey(
        'checkout-session',
        brewery.id,
        tier,
        billingInterval,
        includeWhiteGlove ? 'white-glove' : 'standard'
      ),
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe Checkout]', err)
    return Response.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
