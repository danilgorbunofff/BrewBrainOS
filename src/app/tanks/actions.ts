'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTank(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) {
    throw new Error('No brewery configured')
  }

  const name = formData.get('name') as string
  const capacity = formData.get('capacity') as string

  if (!name || name.trim() === '') {
    throw new Error('Tank name is required')
  }

  const { error } = await supabase.from('tanks').insert({
    name: name.trim(),
    capacity: capacity ? parseFloat(capacity) : null,
    brewery_id: brewery.id,
    status: 'empty'
  })

  if (error) {
    console.error('Failed to add tank:', error)
    throw new Error('Failed to create tank')
  }

  revalidatePath('/tanks')
}
