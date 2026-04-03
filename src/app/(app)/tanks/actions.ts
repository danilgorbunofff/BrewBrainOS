'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { tankSchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'

export async function addTank(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const rawData = {
      id: formData.get('id') ? (formData.get('id') as string) : undefined,
      name: formData.get('name') as string,
      capacity: formData.get('capacity') ? parseFloat(formData.get('capacity') as string) : undefined,
    }

    const result = tankSchema.safeParse(rawData)
    
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    const { error } = await supabase.from('tanks').insert({
      ...result.data,
      brewery_id: brewery.id,
    })

    if (error) {
      console.error('Failed to add tank:', error)
      return { success: false, error: 'Database error: Failed to create tank' }
    }

    revalidatePath('/tanks')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication error' }
  }
}

export async function deleteTank(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const tankId = formData.get('tankId') as string

    if (!tankId) return { success: false, error: 'Tank ID is required' }

    // First delete dependent records (like sanitation logs) to avoid foreign key violations
    const { error: logsError } = await supabase
      .from('sanitation_logs')
      .delete()
      .eq('tank_id', tankId)

    if (logsError) {
      console.error('Failed to clear sanitation logs:', logsError)
      return { success: false, error: 'Failed to clear related cleaning logs' }
    }

    const { error } = await supabase
      .from('tanks')
      .delete()
      .eq('id', tankId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to delete tank:', error)
      return { success: false, error: 'Failed to delete tank from database' }
    }

    revalidatePath('/tanks')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Operation failed' }
  }
}
