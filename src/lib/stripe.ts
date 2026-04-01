/**
 * BrewBrain OS — Stripe Server Utilities
 * Only import this in server components / route handlers / server actions.
 */

import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import type { TierSlug } from '@/lib/tier-config'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY is not set — billing will not work.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
  typescript: true,
})

/**
 * Get or create a Stripe customer for the given user.
 * Stores stripe_customer_id in the subscriptions table.
 */
export async function getOrCreateStripeCustomer(
  breweryId: string,
  userEmail: string
): Promise<string> {
  const supabase = await createClient()

  // Check if we already have a customer
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('brewery_id', breweryId)
    .single()

  if (sub?.stripe_customer_id) {
    return sub.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: { brewery_id: breweryId },
  })

  // Upsert subscription row with customer ID
  await supabase.from('subscriptions').upsert(
    {
      brewery_id: breweryId,
      stripe_customer_id: customer.id,
      tier: 'free',
      status: 'inactive',
    },
    { onConflict: 'brewery_id' }
  )

  return customer.id
}

/**
 * Fetch the subscription record for a brewery.
 */
export async function getSubscription(breweryId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('brewery_id', breweryId)
    .single()

  return data as {
    id: string
    brewery_id: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    tier: TierSlug
    status: string
    current_period_start: string | null
    current_period_end: string | null
    white_glove_paid: boolean
    created_at: string
    updated_at: string
  } | null
}

/**
 * Map a Stripe price ID back to our tier slug.
 */
export function priceIdToTier(priceId: string): TierSlug {
  if (priceId === process.env.STRIPE_PRICE_NANO) return 'nano'
  if (priceId === process.env.STRIPE_PRICE_PRODUCTION) return 'production'
  if (priceId === process.env.STRIPE_PRICE_MULTI_SITE) return 'multi_site'
  return 'free'
}
