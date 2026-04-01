/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session so users can manage
 * their subscription (change plan, update payment, cancel).
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
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

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('brewery_id', brewery.id)
      .single()

    if (!sub?.stripe_customer_id) {
      return Response.json(
        { error: 'No subscription found. Subscribe first.' },
        { status: 404 }
      )
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/billing`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe Portal]', err)
    return Response.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
