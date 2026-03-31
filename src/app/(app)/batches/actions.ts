'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBatch(formData: FormData) {
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

  const recipeName = formData.get('recipeName') as string
  const og = formData.get('og') as string

  if (!recipeName || recipeName.trim() === '') {
    throw new Error('Recipe name is required')
  }

  const { error } = await supabase.from('batches').insert({
    recipe_name: recipeName.trim(),
    brewery_id: brewery.id,
    og: og ? parseFloat(og) : null,
    fg: null,
    status: 'fermenting'
  })

  if (error) {
    console.error('Failed to add batch:', error)
    throw new Error('Failed to create batch')
  }

  revalidatePath('/batches')
}

export async function deleteBatch(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const batchId = formData.get('batchId') as string

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('No brewery configured')

  // Also clear any tank that references this batch
  await supabase
    .from('tanks')
    .update({ current_batch_id: null, status: 'empty' })
    .eq('current_batch_id', batchId)
    .eq('brewery_id', brewery.id)

  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('id', batchId)
    .eq('brewery_id', brewery.id)

  if (error) {
    console.error('Failed to delete batch:', error)
    throw new Error('Failed to delete batch')
  }

  revalidatePath('/batches')
}
