'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveBrewery } from '@/lib/active-brewery'
import { sanitizeDbError } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────
const optNum = () => z.preprocess((v) => (v === '' || v == null ? undefined : parseFloat(String(v))), z.number().optional())
const reqNum = (min = 0) => z.preprocess((v) => parseFloat(String(v)), z.number().min(min))
const optStr = (max = 200) => z.string().max(max).optional().nullable()
const optBool = () => z.preprocess((v) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1'
  return false
}, z.boolean().optional())

// ─── Tank Import ─────────────────────────────────────────────────────
const tankImportRowSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: reqNum(0),
  status: z.enum(['ready', 'fermenting', 'conditioning', 'cleaning', 'maintenance']).catch('ready'),
})

// ─── Inventory Import ────────────────────────────────────────────────
const inventoryImportRowSchema = z.object({
  // Required
  item_type: z.string().min(1),
  name: z.string().min(1).max(200),
  current_stock: reqNum(0),
  unit: z.string().min(1).max(50),
  // Optional core
  reorder_point: optNum(),
  lot_number: optStr(100),
  expiration_date: optStr(),
  manufacturer: optStr(),
  // Supplier / purchasing metadata
  supplier_name: optStr(),
  purchase_price: optNum(),
  lead_time_days: optNum(),
  min_order_quantity: optNum(),
  avg_weekly_usage: optNum(),
  suppress_reorder_alerts: optBool(),
  // Degradation tracking
  received_date: optStr(),
  storage_condition: z.enum(['cool_dry', 'cool_humid', 'room_temp', 'warm']).catch('cool_dry').optional(),
  degradation_tracked: optBool(),
  hsi_initial: optNum(),
  hsi_current: optNum(),
  grain_moisture_initial: optNum(),
  grain_moisture_current: optNum(),
  ppg_initial: optNum(),
  ppg_current: optNum(),
})

const validInventoryTypes = ['Hops', 'Grain', 'Yeast', 'Adjunct', 'Packaging'] as const

// ─── Batch Import ────────────────────────────────────────────────────
const batchImportRowSchema = z.object({
  recipe_name: z.string().min(1).max(200),
  status: z.enum(['brewing', 'fermenting', 'conditioning', 'packaging', 'complete']).catch('brewing'),
  og: optNum(),
  fg: optNum(),
  target_temp: optNum(),
})

// ─── Supplier Import ─────────────────────────────────────────────────
const supplierImportRowSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  supplier_type: z.enum(['Distributor', 'Direct', 'Cooperative']).catch('Direct'),
  contact_person: optStr(),
  email: optStr(),
  phone: optStr(),
  address: optStr(),
  city: optStr(),
  state: optStr(),
  zip_code: optStr(20),
  website: optStr(),
  specialty: optStr(),
  notes: optStr(500),
})

// ─── Recipe Import ───────────────────────────────────────────────────
const recipeImportRowSchema = z.object({
  name: z.string().min(1).max(200),
  style: optStr(),
  batch_size_bbls: reqNum(0.01),
  target_og: optNum(),
  target_fg: optNum(),
  target_ibu: optNum(),
  target_abv: optNum(),
  notes: optStr(500),
})

// ─── Actions ─────────────────────────────────────────────────────────

export async function importTanks(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const tanksToInsert = []
    for (const row of data) {
      const parsed = tankImportRowSchema.safeParse(row)
      if (!parsed.success) continue
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
      if (!parsed.success) continue

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
        // Supplier / purchasing
        supplier_name: parsed.data.supplier_name ?? null,
        purchase_price: parsed.data.purchase_price ?? null,
        lead_time_days: parsed.data.lead_time_days ?? null,
        min_order_quantity: parsed.data.min_order_quantity ?? null,
        avg_weekly_usage: parsed.data.avg_weekly_usage ?? null,
        suppress_reorder_alerts: parsed.data.suppress_reorder_alerts ?? false,
        // Degradation
        received_date: parsed.data.received_date ?? null,
        storage_condition: parsed.data.storage_condition ?? 'cool_dry',
        degradation_tracked: parsed.data.degradation_tracked ?? false,
        hsi_initial: parsed.data.hsi_initial ?? null,
        hsi_current: parsed.data.hsi_current ?? null,
        grain_moisture_initial: parsed.data.grain_moisture_initial ?? null,
        grain_moisture_current: parsed.data.grain_moisture_current ?? null,
        ppg_initial: parsed.data.ppg_initial ?? null,
        ppg_current: parsed.data.ppg_current ?? null,
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

export async function importBatches(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const batchesToInsert = []
    for (const row of data) {
      const parsed = batchImportRowSchema.safeParse(row)
      if (!parsed.success) continue
      batchesToInsert.push({
        brewery_id: brewery.id,
        recipe_name: parsed.data.recipe_name,
        status: parsed.data.status,
        og: parsed.data.og ?? null,
        fg: parsed.data.fg ?? null,
        target_temp: parsed.data.target_temp ?? null,
      })
    }

    if (batchesToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('batches').insert(batchesToInsert)

    if (error) {
      console.error('Batch import error:', error)
      return { success: false, error: sanitizeDbError(error, 'importBatches') }
    }

    revalidatePath('/batches')
    return { success: true, count: batchesToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'importBatches') }
  }
}

export async function importSuppliers(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const suppliersToInsert = []
    for (const row of data) {
      const parsed = supplierImportRowSchema.safeParse(row)
      if (!parsed.success) continue
      suppliersToInsert.push({
        brewery_id: brewery.id,
        name: parsed.data.name,
        country: parsed.data.country,
        supplier_type: parsed.data.supplier_type,
        contact_person: parsed.data.contact_person ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
        zip_code: parsed.data.zip_code ?? null,
        website: parsed.data.website ?? null,
        specialty: parsed.data.specialty ?? null,
        notes: parsed.data.notes ?? null,
      })
    }

    if (suppliersToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('suppliers').insert(suppliersToInsert)

    if (error) {
      console.error('Supplier import error:', error)
      return { success: false, error: sanitizeDbError(error, 'importSuppliers') }
    }

    revalidatePath('/suppliers')
    return { success: true, count: suppliersToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'importSuppliers') }
  }
}

export async function importRecipes(data: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const recipesToInsert = []
    for (const row of data) {
      const parsed = recipeImportRowSchema.safeParse(row)
      if (!parsed.success) continue
      recipesToInsert.push({
        brewery_id: brewery.id,
        name: parsed.data.name,
        style: parsed.data.style ?? null,
        batch_size_bbls: parsed.data.batch_size_bbls,
        target_og: parsed.data.target_og ?? null,
        target_fg: parsed.data.target_fg ?? null,
        target_ibu: parsed.data.target_ibu ?? null,
        target_abv: parsed.data.target_abv ?? null,
        notes: parsed.data.notes ?? null,
      })
    }

    if (recipesToInsert.length === 0) return { success: false, error: 'No valid rows found' }

    const { error } = await supabase.from('recipes').insert(recipesToInsert)

    if (error) {
      console.error('Recipe import error:', error)
      return { success: false, error: sanitizeDbError(error, 'importRecipes') }
    }

    revalidatePath('/recipes')
    return { success: true, count: recipesToInsert.length }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'importRecipes') }
  }
}
