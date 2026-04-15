import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export const ACTIVE_BREWERY_COOKIE = 'brewbrain_active_brewery'

export interface BrewerySummary {
  id: string
  name: string
  license_number: string | null
  subscription_tier?: string
}

/**
 * Get all breweries the authenticated user owns.
 */
export async function getUserBreweries(): Promise<BrewerySummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('breweries')
    .select('id, name, license_number, subscription_tier')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching user breweries:', error)
    return []
  }

  return (data as BrewerySummary[]) || []
}

/**
 * Get the currently active brewery for the authenticated user.
 * 
 * Resolution order:
 * 1. Cookie-stored active brewery ID (if it belongs to this user)
 * 2. First brewery owned by this user (fallback)
 * 3. null (user has no breweries)
 */
export async function getActiveBrewery(): Promise<BrewerySummary | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const storedId = cookieStore.get(ACTIVE_BREWERY_COOKIE)?.value

  // If we have a cookie, verify it belongs to this user
  if (storedId) {
    const { data, error } = await supabase
      .from('breweries')
      .select('id, name, license_number, subscription_tier')
      .eq('id', storedId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active brewery by cookie ID:', error)
    }

    if (data) return data as BrewerySummary
  }

  // Fallback: first brewery
  const { data, error } = await supabase
    .from('breweries')
    .select('id, name, license_number, subscription_tier')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching fallback active brewery:', error)
  }

  return (data as BrewerySummary) || null
}

/**
 * Set the active brewery ID in a cookie.
 * Called from a server action when the user switches breweries.
 */
export async function setActiveBreweryId(breweryId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_BREWERY_COOKIE, breweryId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}
