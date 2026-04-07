'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { ActionResult, BatchListItem } from '@/types/database'

export async function addBatch(formData: FormData): Promise<ActionResult<BatchListItem>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const id = (formData.get('id') as string | null)?.trim() || undefined

    const recipeName = formData.get('recipeName') as string

    if (!recipeName || recipeName.trim() === '') {
      return { success: false, error: 'Recipe name is required' }
    }

    const ogText = formData.get('og') as string
    const og = ogText && ogText.trim() !== '' ? parseFloat(ogText) : null

    const insertPayload = {
      ...(id ? { id } : {}),
      brewery_id: brewery.id,
      recipe_name: recipeName.trim(),
      status: 'fermenting',
      og: og,
      fg: null,
    }

    const { data: newBatch, error } = await supabase.from('batches').insert(insertPayload).select().single()

    if (error) {
      console.error('Failed to add batch:', error)
      return { success: false, error: error.message || 'Database error: Failed to create batch' }
    }

    revalidatePath('/batches')
    return { success: true, data: newBatch }
  } catch (e: unknown) {
    console.error('Batch creation failed:', e)
    return { success: false, error: e instanceof Error ? e.message : String(e) || 'Authentication error' }
  }
}

export async function deleteBatch(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const batchId = formData.get('batchId') as string
    const redirectTo = formData.get('redirectTo') as string

    if (!batchId) return { success: false, error: 'Batch ID is required' }

    // Also clear any tank that references this batch
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
    
    if (redirectTo) {
      redirect(redirectTo)
    }

    return { success: true, data: null }
  } catch (e: unknown) {
    if (e instanceof Error ? e.message : String(e)?.includes('NEXT_REDIRECT') || e.digest?.includes('NEXT_REDIRECT')) throw e
    return { success: false, error: e instanceof Error ? e.message : String(e) || 'Operation failed' }
  }
}
