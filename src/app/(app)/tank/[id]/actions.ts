'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logSanitation(formData: FormData) {
  const supabase = await createClient()
  
  const tankId = formData.get('tankId') as string
  const notes = (formData.get('notes') as string)?.trim() || 'Routine cleaning'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

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
  const supabase = await createClient()
  
  const tankId = formData.get('tankId') as string
  const batchId = formData.get('batchId') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify ownership via brewery
  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('Brewery not found')

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
  const supabase = await createClient()

  const tankId = formData.get('tankId') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('Brewery not found')

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
