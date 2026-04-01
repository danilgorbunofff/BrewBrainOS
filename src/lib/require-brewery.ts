import { createClient } from '@/utils/supabase/server'
import { getActiveBrewery } from '@/lib/active-brewery'

/**
 * Get the active brewery for the current user within a server action.
 * Throws if not authenticated or no brewery found.
 */
export async function requireActiveBrewery() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const brewery = await getActiveBrewery()
  if (!brewery) throw new Error('No brewery found')

  return { supabase, user, brewery }
}
