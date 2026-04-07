'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveBrewery } from '@/lib/active-brewery'
import { sanitizeDbError } from '@/lib/utils'

const tankImportRowSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.preprocess((v) => parseFloat(String(v)), z.number().min(0)),
  status: z.enum(['empty', 'ready', 'fermenting', 'conditioning', 'cleaning', 'maintenance']).catch('empty'),
})

const inventoryImportRowSchema = z.object({
  item_type: z.string().min(1),
  name: z.string().min(1).max(200),
  current_stock: z.preprocess((v) => parseFloat(String(v)), z.number().min(0)),
  unit: z.string().min(1).max(50),
  reorder_point: z.preprocess((v) => parseFloat(String(v)), z.number().min(0)).optional(),
  lot_number: z.string().max(100).optional().nullable(),
  expiration_date: z.string().optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
})

const validInventoryTypes = ['Hops', 'Grain', 'Yeast', 'Adjunct'] as const

export async function importTanks(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const tanksToInsert = []
    for (const row of data) {
      const parsed = tankImportRowSchema.safeParse(row)
      if (!parsed.success) continue // skip invalid rows silently
      tanksToInsert.push({
        brewery_id: brewery.id,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        status: parsed.data.status,
      })
    }

    if (tanksToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('tanks').insert(tanksToInsert)

    if (error) {
      console.error('Tank batch insert error:', error)
      return { success: false, error: sanitizeDbError(error, 'importTanks') }
    }

    revalidatePath('/tanks')
    return { success: true, count: tanksToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'importTanks') }
  }
}

export async function importInventory(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const inventoryToInsert = []
    for (const row of data) {
      const parsed = inventoryImportRowSchema.safeParse(row)
      if (!parsed.success) continue // skip invalid rows

      const rawType = parsed.data.item_type.trim()
      const match = validInventoryTypes.find(
        (t) => t.toLowerCase() === rawType.toLowerCase()
      )
      const itemType = match ?? 'Adjunct'

      inventoryToInsert.push({
        brewery_id: brewery.id,
        item_type: itemType,
        name: parsed.data.name,
        current_stock: parsed.data.current_stock,
        unit: parsed.data.unit,
        reorder_point: parsed.data.reorder_point ?? 0,
        lot_number: parsed.data.lot_number ?? null,
        expiration_date: parsed.data.expiration_date ?? null,
        manufacturer: parsed.data.manufacturer ?? null,
      })
    }

    if (inventoryToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('inventory').insert(inventoryToInsert)

    if (error) {
      console.error('Inventory batch insert error:', error)
      return { success: false, error: sanitizeDbError(error, 'importInventory') }
    }

    revalidatePath('/inventory')
    return { success: true, count: inventoryToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'importInventory') }
  }
}
