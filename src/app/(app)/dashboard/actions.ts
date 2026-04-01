'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { setActiveBreweryId } from '@/lib/active-brewery'

export async function setupBrewery(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  if (!name || name.trim() === '') {
    throw new Error('Brewery name is required')
  }

  const { data: newBrewery, error } = await supabase
    .from('breweries')
    .insert({
      name: name.trim(),
      owner_id: user.id
    })
    .select('id')
    .single()

  if (error || !newBrewery) {
    console.error('Failed to setup brewery:', error)
    throw new Error('Database Error: Could not create brewery.')
  }

  // Automatically set the new brewery as active
  await setActiveBreweryId(newBrewery.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
