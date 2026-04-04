'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { batchSchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'

export async function updateBatchStatus(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const batchId = formData.get('batchId') as string
    const status = formData.get('status') as any

    if (!batchId) return { success: false, error: 'Batch ID is required' }

    // Minimal validation using Zod for the status enum if needed
    const { error } = await supabase
      .from('batches')
      .update({ status })
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to update batch status:', error)
      return { success: false, error: 'Failed to update batch status' }
    }

    revalidatePath(`/batches/${batchId}`)
    revalidatePath('/batches')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication error' }
  }
}

export async function updateBatchFG(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const batchId = formData.get('batchId') as string
    const fg = parseFloat(formData.get('fg') as string)

    if (!batchId) return { success: false, error: 'Batch ID is required' }
    if (isNaN(fg)) return { success: false, error: 'Invalid gravity value' }

    const { error } = await supabase
      .from('batches')
      .update({ fg })
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to update final gravity:', error)
      return { success: false, error: 'Failed to update final gravity' }
    }

    // Also create a reading so it shows on the dashboard chart
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('batch_readings').insert({
      batch_id: batchId,
      gravity: fg,
      logger_id: user?.id,
      notes: 'Manual gravity log'
    })

    revalidatePath(`/batches/${batchId}`)
    revalidatePath('/batches')
    revalidatePath('/dashboard')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication error' }
  }
}
