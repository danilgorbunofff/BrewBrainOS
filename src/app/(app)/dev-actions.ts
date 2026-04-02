'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function setDevSubscriptionTier(breweryId: string, tier: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not in development mode')
  }

  const cookieStore = await cookies()
  cookieStore.set('dev_override_tier', tier, { path: '/' })

  const supabase = await createClient()

  // First check if a subscription exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('brewery_id', breweryId)
    .maybeSingle()

  if (existingSub) {
    await supabase
      .from('subscriptions')
      .update({ tier, status: 'active' })
      .eq('brewery_id', breweryId)
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        brewery_id: breweryId,
        tier,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
  }

  // Update brewery denormalized column
  const { error: brewError } = await supabase
    .from('breweries')
    .update({ subscription_tier: tier })
    .eq('id', breweryId)

  if (brewError) console.error('DevTools: Failed to update brewery tier:', brewError)

  console.log(`DevTools: Forced tier ${tier} for brewery ${breweryId}`)

  revalidatePath('/', 'layout')
}

export async function seedMockBatches(breweryId: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not in development mode')
  }

  const supabase = await createClient()
  const MOCK_RECIPES = ['Hazy IPA', 'Oatmeal Stout', 'Czech Pilsner', 'West Coast IPA', 'Sour Ale']
  const MOCK_STATUSES = ['fermenting', 'conditioning', 'ready']
  
  const batchesToInsert = Array.from({ length: 10 }).map(() => ({
    brewery_id: breweryId,
    recipe_name: `${MOCK_RECIPES[Math.floor(Math.random() * MOCK_RECIPES.length)]} #${Math.floor(Math.random() * 1000)}`,
    status: MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)],
    og: (1.040 + Math.random() * 0.040).toFixed(3),
    fg: null
  }))

  const { error } = await supabase.from('batches').insert(batchesToInsert)
  
  if (error) {
    console.error('DevTools: Failed to seed batches', error)
    throw new Error('Failed to seed batches')
  }

  console.log(`DevTools: Seeded 10 mock batches for brewery ${breweryId}`)
  revalidatePath('/batches')
  revalidatePath('/dashboard')
}
