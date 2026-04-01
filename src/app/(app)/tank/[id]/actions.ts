'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'

export async function logSanitation(formData: FormData) {
  const { supabase, user } = await requireActiveBrewery()
  
  const tankId = formData.get('tankId') as string
  const notes = (formData.get('notes') as string)?.trim() || 'Routine cleaning'

  const { error } = await supabase
    .from('sanitation_logs')
    .insert({
      tank_id: tankId,
      user_id: user.id,
      notes: notes
    })

  if (error) {
    console.error('Failed to log sanitation:', error)
    throw new Error('Database Error: Failed to log sanitation.')
  }

  revalidatePath(`/tank/${tankId}`)
}

export async function assignBatch(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()
  
  const tankId = formData.get('tankId') as string
  const batchId = formData.get('batchId') as string

  const { error } = await supabase
    .from('tanks')
    .update({ current_batch_id: batchId, status: 'fermenting' })
    .eq('id', tankId)
    .eq('brewery_id', brewery.id)

  if (error) {
    console.error('Failed to assign batch:', error)
    throw new Error('Failed to assign batch to tank')
  }

  revalidatePath(`/tank/${tankId}`)
}

export async function unassignBatch(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const tankId = formData.get('tankId') as string

  const { error } = await supabase
    .from('tanks')
    .update({ current_batch_id: null, status: 'empty' })
    .eq('id', tankId)
    .eq('brewery_id', brewery.id)

  if (error) {
    console.error('Failed to unassign batch:', error)
    throw new Error('Failed to unassign batch from tank')
  }

  revalidatePath(`/tank/${tankId}`)
}
