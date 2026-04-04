'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { inventorySchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'
import { sendInventoryAlert } from '@/app/actions/push-actions'

export async function addInventoryItem(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const rawData = {
      name: formData.get('name') as string,
      item_type: formData.get('itemType') as any,
      current_stock: formData.get('currentStock') ? Number(formData.get('currentStock')) : undefined,
      reorder_point: formData.get('reorderPoint') ? Number(formData.get('reorderPoint')) : undefined,
      unit: formData.get('unit') as string,
    }

    const result = inventorySchema.safeParse(rawData)
    
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    const typeMap: Record<string, string> = {
      hop: 'Hops',
      grain: 'Grain',
      yeast: 'Yeast',
      adjunct: 'Adjunct',
      packaging: 'Packaging'
    }

    const { error } = await supabase.from('inventory').insert({
      ...result.data,
      item_type: typeMap[result.data.item_type] || result.data.item_type,
      brewery_id: brewery.id
    })

    if (error) {
      console.error('Failed to add inventory item:', error)
      return { success: false, error: 'Database error: Failed to create inventory item' }
    }

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Authentication error' }
  }
}

export async function deleteInventoryItem(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const itemId = formData.get('itemId') as string

    if (!itemId) return { success: false, error: 'Item ID is required' }

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to delete inventory item:', error)
      return { success: false, error: 'Failed to delete item from database' }
    }

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Operation failed' }
  }
}

export async function updateStock(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const itemId = formData.get('itemId') as string
    const newStock = Number(formData.get('stock'))

    if (!itemId) return { success: false, error: 'Item ID is required' }
    if (isNaN(newStock)) return { success: false, error: 'Invalid stock amount' }

    const { error } = await supabase
      .from('inventory')
      .update({ current_stock: newStock })
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to update stock:', error)
      return { success: false, error: 'Failed to update stock level' }
    }

    // Check against reorder point for push notification
    const { data: item } = await supabase
      .from('inventory')
      .select('name, reorder_point')
      .eq('id', itemId)
      .single()

    if (item && item.reorder_point != null && newStock <= item.reorder_point) {
      // Fire and forget
      sendInventoryAlert(brewery.id, item.name, newStock).catch(console.error)
    }

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Operation failed' }
  }
}
