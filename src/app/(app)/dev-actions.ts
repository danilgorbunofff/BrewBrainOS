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

export async function seedScenario(breweryId: string, scenario: 'fermentation' | 'inventory_empty' | 'inventory_full' | 'alerts' | 'vessels') {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not in development mode')
  }

  const supabase = await createClient()

  if (scenario === 'inventory_empty') {
    await supabase.from('inventory').delete().eq('brewery_id', breweryId)
    revalidatePath('/inventory')
    return { success: true, message: 'Inventory cleared' }
  }

  if (scenario === 'inventory_full') {
    const items = [
      { brewery_id: breweryId, name: 'Pilsner Malt', item_type: 'Grain', current_stock: 1200, unit: 'kg', reorder_point: 200 },
      { brewery_id: breweryId, name: 'Citra Hops', item_type: 'Hops', current_stock: 15, unit: 'kg', reorder_point: 5 },
      { brewery_id: breweryId, name: 'US-05 Dry Yeast', item_type: 'Yeast', current_stock: 24, unit: 'pck', reorder_point: 10 },
      { brewery_id: breweryId, name: 'Canning Lids', item_type: 'Packaging', current_stock: 5000, unit: 'pcs', reorder_point: 1000 },
    ]
    await supabase.from('inventory').insert(items)
    revalidatePath('/inventory')
    return { success: true, message: 'Full inventory seeded' }
  }

  if (scenario === 'vessels') {
    const vessels = [
      { brewery_id: breweryId, name: 'FV-01', status: 'ready', capacity: 10 },
      { brewery_id: breweryId, name: 'FV-02', status: 'fermenting', capacity: 20 },
      { brewery_id: breweryId, name: 'BBT-01', status: 'conditioning', capacity: 20 },
      { brewery_id: breweryId, name: 'Serving-01', status: 'ready', capacity: 5 },
    ]
    await supabase.from('tanks').insert(vessels)
    revalidatePath('/tanks')
    revalidatePath('/dashboard')
    return { success: true, message: 'Vessels seeded' }
  }

  if (scenario === 'fermentation') {
    const { data: batch, error } = await supabase
      .from('batches')
      .insert({
        brewery_id: breweryId,
        recipe_name: 'Active Hazy IPA #SCENARIO',
        status: 'fermenting',
        og: '1.065',
      })
      .select()
      .single()

    if (error || !batch) throw new Error('Failed to create fermentation batch')

    // Add some mock logs
    const now = new Date()
    const logs = [
      { batch_id: batch.id, gravity: '1.065', temperature: 19.5, created_at: new Date(now.getTime() - 86400000).toISOString() },
      { batch_id: batch.id, gravity: '1.045', temperature: 20.1, created_at: new Date(now.getTime() - 43200000).toISOString() },
      { batch_id: batch.id, gravity: '1.032', temperature: 19.8, created_at: now.toISOString() },
    ]

    await supabase.from('batch_readings').insert(logs)
    
    revalidatePath('/batches')
    revalidatePath('/dashboard')
    return { success: true, message: 'Fermentation scenario seeded' }
  }

  if (scenario === 'alerts') {
    // Just seed a batch that looks like it needs attention (e.g. status ready but no action taken)
    await supabase.from('batches').insert({
      brewery_id: breweryId,
      recipe_name: 'Warning Stout #SCENARIO',
      status: 'ready',
      og: '1.050',
      fg: '1.012'
    })
    
    revalidatePath('/batches')
    return { success: true, message: 'Alert scenario seeded' }
  }
}

export async function nuclearReset(breweryId: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not in development mode')
  }

  const supabase = await createClient()

  // 1. Get all batches for this brewery to clean up related logs
  const { data: batches } = await supabase
    .from('batches')
    .select('id')
    .eq('brewery_id', breweryId)

  if (batches && batches.length > 0) {
    const batchIds = batches.map(b => b.id)
    await supabase.from('batch_readings').delete().in('batch_id', batchIds)
  }

  // 2. Delete main entities
  await supabase.from('batches').delete().eq('brewery_id', breweryId)
  await supabase.from('tanks').delete().eq('brewery_id', breweryId)
  await supabase.from('inventory').delete().eq('brewery_id', breweryId)
  await supabase.from('sanitation_logs').delete().eq('brewery_id', breweryId)

  revalidatePath('/', 'layout')
  console.log(`DevTools: NUCLEAR RESET for brewery ${breweryId}`)
  return { success: true }
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
