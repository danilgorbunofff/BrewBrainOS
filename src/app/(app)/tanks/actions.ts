'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'

export async function addTank(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

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

export async function deleteTank(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const tankId = formData.get('tankId') as string

  const { error } = await supabase
    .from('tanks')
    .delete()
    .eq('id', tankId)
    .eq('brewery_id', brewery.id)

  if (error) {
    console.error('Failed to delete tank:', error)
    throw new Error('Failed to delete tank')
  }

  revalidatePath('/tanks')
}
