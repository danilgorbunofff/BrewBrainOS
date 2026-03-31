'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  const { error } = await supabase.from('breweries').insert({
    name: name.trim(),
    owner_id: user.id
  })

  if (error) {
    console.error('Failed to setup brewery:', error)
    throw new Error('Database Error: Could not create brewery.')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
