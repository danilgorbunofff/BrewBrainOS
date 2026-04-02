'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { batchSchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'

export async function addBatch(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const rawData = {
      recipe_name: formData.get('recipeName') as string,
      og: formData.get('og') ? parseFloat(formData.get('og') as string) : undefined,
      status: 'fermenting' // Default to fermenting as per existing logic
    }

    const result = batchSchema.safeParse(rawData)
    
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    const { error } = await supabase.from('batches').insert({
      ...result.data,
      brewery_id: brewery.id,
      fg: null,
    })

    if (error) {
      console.error('Failed to add batch:', error)
      return { success: false, error: 'Database error: Failed to create batch' }
    }

    revalidatePath('/batches')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication error' }
  }
}

export async function deleteBatch(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const batchId = formData.get('batchId') as string

    if (!batchId) return { success: false, error: 'Batch ID is required' }

    // Also clear any tank that references this batch
    // Standardizing status to 'ready' instead of 'empty'
    await supabase
      .from('tanks')
      .update({ current_batch_id: null, status: 'ready' })
      .eq('current_batch_id', batchId)
      .eq('brewery_id', brewery.id)

    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to delete batch:', error)
      return { success: false, error: 'Failed to delete batch from database' }
    }

    revalidatePath('/batches')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Operation failed' }
  }
}
