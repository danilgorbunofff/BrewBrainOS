'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveBrewery } from '@/lib/active-brewery'

export async function importTanks(data: any[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    // Map and sanitize
    const tanksToInsert = data.map((row: any) => ({
      brewery_id: brewery.id,
      name: row.name || 'Unnamed Tank',
      capacity: parseFloat(row.capacity) || 0,
      status: (row.status || 'empty').toLowerCase(),
    }))

    if (tanksToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('tanks').insert(tanksToInsert)

    if (error) {
      console.error('Batch insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/tanks')
    return { success: true, count: tanksToInsert.length }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function importInventory(data: any[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const validTypes = ['Hops', 'Grain', 'Yeast', 'Adjunct']

    const inventoryToInsert = data.map((row: any) => {
      let itemType = 'Adjunct'
      
      // Basic normalization
      const rawType = String(row.item_type || '').trim()
      const match = validTypes.find(t => t.toLowerCase() === rawType.toLowerCase())
      if (match) itemType = match

      return {
        brewery_id: brewery.id,
        item_type: itemType,
        name: row.name || 'Unnamed Item',
        current_stock: parseFloat(row.current_stock) || 0,
        unit: row.unit || 'kg',
        reorder_point: parseFloat(row.reorder_point) || 0,
      }
    })

    if (inventoryToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('inventory').insert(inventoryToInsert)

    if (error) {
      console.error('Batch insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true, count: inventoryToInsert.length }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
