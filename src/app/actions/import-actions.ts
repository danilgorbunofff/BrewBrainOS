'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveBrewery } from '@/lib/active-brewery'

export async function importTanks(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    // Map and sanitize
    const tanksToInsert = data.map((row) => ({
      brewery_id: brewery.id,
      name: String(row.name || 'Unnamed Tank'),
      capacity: parseFloat(String(row.capacity)) || 0,
      status: String(row.status || 'empty').toLowerCase(),
    }))

    if (tanksToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('tanks').insert(tanksToInsert)

    if (error) {
      console.error('Batch insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/tanks')
    return { success: true, count: tanksToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function importInventory(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const validTypes = ['Hops', 'Grain', 'Yeast', 'Adjunct']

    const inventoryToInsert = data.map((row) => {
      let itemType = 'Adjunct'
      
      // Basic normalization
      const rawType = String(row.item_type || '').trim()
      const match = validTypes.find(t => t.toLowerCase() === rawType.toLowerCase())
      if (match) itemType = match

      return {
        brewery_id: brewery.id,
        item_type: itemType,
        name: String(row.name || 'Unnamed Item'),
        current_stock: parseFloat(String(row.current_stock)) || 0,
        unit: String(row.unit || 'kg'),
        reorder_point: parseFloat(String(row.reorder_point)) || 0,
        lot_number: row.lot_number ? String(row.lot_number) : null,
        expiration_date: row.expiration_date ? String(row.expiration_date) : null,
        manufacturer: row.manufacturer ? String(row.manufacturer) : null,
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
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
