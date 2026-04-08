'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { setActiveBreweryId } from '@/lib/active-brewery'
import { brewerySchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'
import type { TierSlug } from '@/types/database'

const TRIAL_ELIGIBLE_TIERS: TierSlug[] = ['nano', 'production']
const TRIAL_DURATION_DAYS = 14

export async function setupBrewery(formData: FormData): Promise<ActionResult | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized: Please log in again.' }
  }

  const rawData = {
    name: formData.get('name') as string,
  }

  const result = brewerySchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const { data: newBrewery, error } = await supabase
    .from('breweries')
    .insert({
      name: result.data.name.trim(),
      owner_id: user.id
    })
    .select('id')
    .maybeSingle()

  if (error || !newBrewery) {
    console.error('Failed to setup brewery:', error)
    return { success: false, error: error?.message || 'Database Error: Could not create brewery.' }
  }

  // Start a 14-day trial if a valid paid tier was requested
  const requestedTrial = formData.get('trialTier') as string | null
  const trialTier = TRIAL_ELIGIBLE_TIERS.includes(requestedTrial as TierSlug)
    ? (requestedTrial as TierSlug)
    : null

  if (trialTier) {
    const now = new Date()
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)

    await supabase.from('subscriptions').upsert(
      {
        brewery_id: newBrewery.id,
        tier: trialTier,
        status: 'trialing',
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
      },
      { onConflict: 'brewery_id' }
    )

    await supabase
      .from('breweries')
      .update({ subscription_tier: trialTier })
      .eq('id', newBrewery.id)
  }

  // Automatically set the new brewery as active
  await setActiveBreweryId(newBrewery.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
