'use server'

import { createClient } from '@/utils/supabase/server'
import { setActiveBreweryId } from '@/lib/active-brewery'
import { revalidatePath } from 'next/cache'

/**
 * Switch the active brewery to a different one owned by the current user.
 */
export async function switchBrewery(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const breweryId = formData.get('breweryId') as string
  if (!breweryId) throw new Error('Brewery ID required')

  // Verify the brewery belongs to this user
  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('id', breweryId)
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('Brewery not found or access denied')

  await setActiveBreweryId(breweryId)

  revalidatePath('/', 'layout')
}

/**
 * Create a new brewery for the current user (multi-site).
 */
export async function createBrewery(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const licenseNumber = formData.get('license_number') as string | null

  if (!name?.trim()) throw new Error('Brewery name is required')

  const { data: newBrewery, error } = await supabase
    .from('breweries')
    .insert({
      name: name.trim(),
      license_number: licenseNumber?.trim() || null,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create brewery:', error)
    throw new Error('Could not create brewery')
  }

  // Auto-switch to the new brewery
  await setActiveBreweryId(newBrewery.id)

  revalidatePath('/', 'layout')
}
