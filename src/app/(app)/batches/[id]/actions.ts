'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'

export async function updateBatchStatus(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const batchId = formData.get('batchId') as string
  const status = formData.get('status') as string

  const { error } = await supabase
    .from('batches')
    .update({ status })
    .eq('id', batchId)
    .eq('brewery_id', brewery.id)

  if (error) throw new Error('Failed to update batch status')

  revalidatePath(`/batches/${batchId}`)
  revalidatePath('/batches')
}

export async function updateBatchFG(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const batchId = formData.get('batchId') as string
  const fg = parseFloat(formData.get('fg') as string)

  if (isNaN(fg)) throw new Error('Invalid gravity value')

  const { error } = await supabase
    .from('batches')
    .update({ fg })
    .eq('id', batchId)
    .eq('brewery_id', brewery.id)

  if (error) throw new Error('Failed to update final gravity')

  revalidatePath(`/batches/${batchId}`)
  revalidatePath('/batches')
}
