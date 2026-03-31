'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBatchStatus(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const batchId = formData.get('batchId') as string
  const status = formData.get('status') as string

  // Verify ownership
  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('Brewery not found')

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const batchId = formData.get('batchId') as string
  const fg = parseFloat(formData.get('fg') as string)

  if (isNaN(fg)) throw new Error('Invalid gravity value')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) throw new Error('Brewery not found')

  const { error } = await supabase
    .from('batches')
    .update({ fg })
    .eq('id', batchId)
    .eq('brewery_id', brewery.id)

  if (error) throw new Error('Failed to update final gravity')

  revalidatePath(`/batches/${batchId}`)
  revalidatePath('/batches')
}
