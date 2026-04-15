'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { ActionResult } from '@/types/database'

export async function logSanitation(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireActiveBrewery()
    
    const tankId = formData.get('tankId') as string
    const notes = (formData.get('notes') as string)?.trim() || 'Routine cleaning'

    if (!tankId) return { success: false, error: 'Tank ID is required' }

    const { error } = await supabase
      .from('sanitation_logs')
      .insert({
        tank_id: tankId,
        user_id: user.id,
        notes: notes
      })

    if (error) {
      console.error('Failed to log sanitation:', error)
      return { success: false, error: 'Database Error: Failed to log sanitation.' }
    }

    revalidatePath(`/tank/${tankId}`)
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) || 'Authentication error' }
  }
}

export async function assignBatch(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    
    const tankId = formData.get('tankId') as string
    const batchId = formData.get('batchId') as string

    if (!tankId || !batchId) return { success: false, error: 'Tank and Batch IDs are required' }

    // Fetch the batch to determine its current status for correct tank status
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('status')
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)
      .single()

    if (batchError || !batch) {
      return { success: false, error: 'Batch not found or access denied' }
    }

    const tankStatus = batch.status === 'conditioning' ? 'conditioning' : 'fermenting'

    const { error } = await supabase
      .from('tanks')
      .update({ current_batch_id: batchId, status: tankStatus })
      .eq('id', tankId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to assign batch:', error)
      return { success: false, error: 'Failed to assign batch to tank' }
    }

    revalidatePath(`/tank/${tankId}`)
    revalidatePath('/tanks')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) || 'Authentication error' }
  }
}

export async function unassignBatch(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const tankId = formData.get('tankId') as string

    if (!tankId) return { success: false, error: 'Tank ID is required' }

    const { error } = await supabase
      .from('tanks')
      .update({ current_batch_id: null, status: 'ready' }) // Use new 'ready' status
      .eq('id', tankId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to unassign batch:', error)
      return { success: false, error: 'Failed to unassign batch from tank' }
    }

    revalidatePath(`/tank/${tankId}`)
    revalidatePath('/tanks')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) || 'Authentication error' }
  }
}
