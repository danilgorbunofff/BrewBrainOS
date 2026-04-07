'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { inventorySchema } from '@/lib/schemas'
import { ActionResult, InventoryItem, DegradationLog, StorageCondition } from '@/types/database'
import { sendInventoryAlert } from '@/app/actions/push-actions'
import {
  recalculateDegradationMetrics,
  generateDegradationAlerts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDegradationHealthStatus,
} from '@/lib/degradation'

// Helper to format date as YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0]
}

export async function addInventoryItem(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const itemType = formData.get('itemType') as string

    const rawData = {
      name: formData.get('name') as string,
      item_type: itemType,
      current_stock: formData.get('currentStock') ? Number(formData.get('currentStock')) : undefined,
      reorder_point: formData.get('reorderPoint') ? Number(formData.get('reorderPoint')) : undefined,
      unit: formData.get('unit') as string,
      lot_number: (formData.get('lotNumber') as string) || null,
      expiration_date: (formData.get('expirationDate') as string) || null,
      manufacturer: (formData.get('manufacturer') as string) || null,
      
      // Degradation metrics
      received_date: (formData.get('receivedDate') as string) || new Date().toISOString().split('T')[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage_condition: (formData.get('storageCondition') as any) || 'cool_dry',
      hsi_initial: itemType === 'hop' ? (formData.get('hsiInitial') ? Number(formData.get('hsiInitial')) : null) : null,
      hsi_current: itemType === 'hop' ? (formData.get('hsiInitial') ? Number(formData.get('hsiInitial')) : null) : null,
      grain_moisture_initial: itemType === 'grain' ? (formData.get('grainMoistureInitial') ? Number(formData.get('grainMoistureInitial')) : null) : null,
      grain_moisture_current: itemType === 'grain' ? (formData.get('grainMoistureInitial') ? Number(formData.get('grainMoistureInitial')) : null) : null,
      ppg_initial: itemType === 'grain' ? (formData.get('ppgInitial') ? Number(formData.get('ppgInitial')) : null) : null,
      ppg_current: itemType === 'grain' ? (formData.get('ppgInitial') ? Number(formData.get('ppgInitial')) : null) : null,
      degradation_tracked: itemType === 'hop' || itemType === 'grain',
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

    // Build insert payload, excluding degradation fields that may not exist in DB schema yet
    const insertData = {
      name: result.data.name,
      item_type: typeMap[result.data.item_type] || result.data.item_type,
      current_stock: result.data.current_stock,
      reorder_point: result.data.reorder_point,
      unit: result.data.unit,
      lot_number: result.data.lot_number,
      expiration_date: result.data.expiration_date,
      manufacturer: result.data.manufacturer,
      brewery_id: brewery.id,
      // Only include degradation fields if they exist in database
      ...(result.data.received_date && { received_date: result.data.received_date }),
      ...(result.data.storage_condition && { storage_condition: result.data.storage_condition }),
      ...(result.data.hsi_initial != null && { hsi_initial: result.data.hsi_initial }),
      ...(result.data.hsi_current != null && { hsi_current: result.data.hsi_current }),
      ...(result.data.grain_moisture_initial != null && { grain_moisture_initial: result.data.grain_moisture_initial }),
      ...(result.data.grain_moisture_current != null && { grain_moisture_current: result.data.grain_moisture_current }),
      ...(result.data.ppg_initial != null && { ppg_initial: result.data.ppg_initial }),
      ...(result.data.ppg_current != null && { ppg_current: result.data.ppg_current }),
    }

    const { error } = await supabase.from('inventory').insert(insertData)

    if (error) {
      console.error('Failed to add inventory item:', error)
      return { success: false, error: 'Database error: Failed to create inventory item' }
    }

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
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
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
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
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Adjust inventory stock by a quantity (for purchase order receipt, batch usage, etc.)
 */
export async function adjustInventoryStock(
  itemId: string,
  adjustment: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason: string = 'Manual adjustment'
): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    if (!itemId) return { success: false, error: 'Item ID is required' }
    if (isNaN(adjustment)) return { success: false, error: 'Invalid adjustment amount' }

    // Get current stock
    const { data: item, error: fetchError } = await supabase
      .from('inventory')
      .select('current_stock, name, reorder_point')
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)
      .single()

    if (fetchError || !item) {
      return { success: false, error: 'Item not found' }
    }

    const newStock = Math.max(0, (item.current_stock || 0) + adjustment)

    // Update stock
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ current_stock: newStock })
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)

    if (updateError) {
      console.error('Failed to adjust stock:', updateError)
      return { success: false, error: 'Failed to update stock level' }
    }

    // Check against reorder point for alerts
    if (item.reorder_point != null && newStock <= item.reorder_point) {
      sendInventoryAlert(brewery.id, item.name, newStock).catch(console.error)
    }

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Update degradation metrics for an inventory item
 * Logs the change to degradation_logs for audit trail
 */
export async function updateDegradationMetrics(
  itemId: string,
  updates: Partial<{
    hsi_current: number
    grain_moisture_current: number
    ppg_current: number
  }>,
  reason: 'manual_input' | 'storage_change' | 'quality_test' = 'manual_input'
): Promise<ActionResult<InventoryItem>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    if (!itemId) return { success: false, error: 'Item ID is required' }

    // Fetch current item
    const { data: item, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)
      .single()

    if (fetchError || !item) {
      return { success: false, error: 'Item not found' }
    }

    // Create degradation log entry
    const { error: logError } = await supabase.from('degradation_logs').insert({
      inventory_id: itemId,
      brewery_id: brewery.id,
      hsi_before: item.hsi_current,
      hsi_after: updates.hsi_current,
      grain_moisture_before: item.grain_moisture_current,
      grain_moisture_after: updates.grain_moisture_current,
      ppg_before: item.ppg_current,
      ppg_after: updates.ppg_current,
      change_reason: reason,
      storage_condition_at_time: item.storage_condition,
      days_elapsed: item.received_date
        ? Math.floor((Date.now() - new Date(item.received_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      logged_by: (await supabase.auth.getUser()).data.user?.id,
    })

    if (logError) {
      console.error('Failed to log degradation change:', logError)
      return { success: false, error: 'Failed to create audit log' }
    }

    // Update inventory item
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        ...updates,
        last_degradation_calc: getToday(),
      })
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)

    if (updateError) {
      console.error('Failed to update degradation metrics:', updateError)
      return { success: false, error: 'Failed to update metrics' }
    }

    // Generate alerts if thresholds crossed
    const alerts = generateDegradationAlerts({
      item_type: item.item_type,
      hsi_current: updates.hsi_current,
      grain_moisture_current: updates.grain_moisture_current,
      ppg_current: updates.ppg_current,
      ppg_initial: item.ppg_initial,
    })

    if (alerts.length > 0) {
      alerts.forEach((alert) => {
        sendInventoryAlert(brewery.id, item.name, alert.level === 'critical' ? 0 : 1).catch(console.error)
      })
    }

    revalidatePath('/inventory')
    return { success: true, data: { ...item, ...updates } }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Change storage condition for an item and trigger recalculation
 */
export async function updateStorageCondition(
  itemId: string,
  newCondition: StorageCondition
): Promise<ActionResult<InventoryItem>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    if (!itemId) return { success: false, error: 'Item ID is required' }

    // Fetch item
    const { data: item, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)
      .single()

    if (fetchError || !item) {
      return { success: false, error: 'Item not found' }
    }

    // Recalculate metrics with new storage condition
    const updatedMetrics = recalculateDegradationMetrics({
      hsi_initial: item.hsi_initial,
      hsi_current: item.hsi_current,
      grain_moisture_initial: item.grain_moisture_initial,
      grain_moisture_current: item.grain_moisture_current,
      ppg_initial: item.ppg_initial,
      ppg_current: item.ppg_current,
      received_date: item.received_date,
      storage_condition: newCondition,
    })

    // Create audit log
    const { error: logError } = await supabase.from('degradation_logs').insert({
      inventory_id: itemId,
      brewery_id: brewery.id,
      hsi_before: item.hsi_current,
      hsi_after: updatedMetrics.hsi_current,
      grain_moisture_before: item.grain_moisture_current,
      grain_moisture_after: updatedMetrics.grain_moisture_current,
      ppg_before: item.ppg_current,
      ppg_after: updatedMetrics.ppg_current,
      change_reason: 'storage_change',
      storage_condition_at_time: newCondition,
      days_elapsed: item.received_date
        ? Math.floor((Date.now() - new Date(item.received_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      logged_by: (await supabase.auth.getUser()).data.user?.id,
    })

    if (logError) {
      console.error('Failed to log storage change:', logError)
    }

    // Update item
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        storage_condition: newCondition,
        hsi_current: updatedMetrics.hsi_current,
        grain_moisture_current: updatedMetrics.grain_moisture_current,
        ppg_current: updatedMetrics.ppg_current,
        last_degradation_calc: getToday(),
      })
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)

    if (updateError) {
      console.error('Failed to update storage condition:', updateError)
      return { success: false, error: 'Failed to update storage condition' }
    }

    revalidatePath('/inventory')
    return {
      success: true,
      data: {
        ...item,
        storage_condition: newCondition,
        hsi_current: updatedMetrics.hsi_current,
        grain_moisture_current: updatedMetrics.grain_moisture_current,
        ppg_current: updatedMetrics.ppg_current,
      },
    }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Fetch degradation audit history for an inventory item
 */
export async function getDegradationHistory(itemId: string): Promise<ActionResult<DegradationLog[]>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    if (!itemId) return { success: false, error: 'Item ID is required' }

    const { data: logs, error } = await supabase
      .from('degradation_logs')
      .select('*')
      .eq('inventory_id', itemId)
      .eq('brewery_id', brewery.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch degradation history:', error)
      return { success: false, error: 'Failed to fetch history' }
    }

    return { success: true, data: logs || [] }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Recalculate all degradation metrics for a brewery
 * (Intended to run as a cron job once daily)
 */
export async function recalculateAllDegradationMetrics(): Promise<ActionResult<void>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    // Fetch all items with degradation tracking enabled
    const { data: items, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('brewery_id', brewery.id)
      .eq('degradation_tracked', true)

    if (fetchError) {
      console.error('Failed to fetch items for degradation calc:', fetchError)
      return { success: false, error: 'Failed to fetch inventory' }
    }

    if (!items || items.length === 0) {
      return { success: true, data: undefined }
    }

    // Batch update all items
    const updates = items.map((item) => {
      const newMetrics = recalculateDegradationMetrics(item)
      return {
        id: item.id,
        ...newMetrics,
        hsi_current: newMetrics.hsi_current,
        grain_moisture_current: newMetrics.grain_moisture_current,
        ppg_current: newMetrics.ppg_current,
        last_degradation_calc: getToday(),
      }
    })

    // Create log entries for significant changes (>1% loss)
    for (const item of items) {
      const newMetrics = recalculateDegradationMetrics(item)

      const hsiChange = item.hsi_current && newMetrics.hsi_current
        ? Math.abs(item.hsi_current - newMetrics.hsi_current)
        : 0

      const moistureChange = item.grain_moisture_current && newMetrics.grain_moisture_current
        ? Math.abs(item.grain_moisture_current - newMetrics.grain_moisture_current)
        : 0

      const ppgChange = item.ppg_current && newMetrics.ppg_current
        ? Math.abs(item.ppg_current - newMetrics.ppg_current)
        : 0

      if (hsiChange > 1 || moistureChange > 1 || ppgChange > 0.5) {
        await supabase.from('degradation_logs').insert({
          inventory_id: item.id,
          brewery_id: brewery.id,
          hsi_before: item.hsi_current,
          hsi_after: newMetrics.hsi_current,
          grain_moisture_before: item.grain_moisture_current,
          grain_moisture_after: newMetrics.grain_moisture_current,
          ppg_before: item.ppg_current,
          ppg_after: newMetrics.ppg_current,
          change_reason: 'auto_calc',
          storage_condition_at_time: item.storage_condition,
          days_elapsed: item.received_date
            ? Math.floor((Date.now() - new Date(item.received_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        })
      }
    }

    // Update all items
    for (const update of updates) {
      const { id, hsi_current, grain_moisture_current, ppg_current, last_degradation_calc } = update
      await supabase
        .from('inventory')
        .update({
          hsi_current,
          grain_moisture_current,
          ppg_current,
          last_degradation_calc,
        })
        .eq('id', id)
    }

    revalidatePath('/inventory')
    return { success: true, data: undefined }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}

/**
 * Update inventory item with supplier information
 */
export async function updateInventorySupplier(
  itemId: string,
  supplierId: string,
  supplierName: string,
  supplierContact?: string,
  purchasePrice?: number,
  reorderFromSupplierId?: string
): Promise<ActionResult<InventoryItem>> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    if (!itemId) return { success: false, error: 'Item ID is required' }
    if (!supplierId) return { success: false, error: 'Supplier ID is required' }

    const { data, error } = await supabase
      .from('inventory')
      .update({
        supplier_id: supplierId,
        supplier_name: supplierName,
        supplier_contact: supplierContact || null,
        purchase_price: purchasePrice || null,
        reorder_from_supplier_id: reorderFromSupplierId || null,
      })
      .eq('id', itemId)
      .eq('brewery_id', brewery.id)
      .select()
      .single()

    if (error) {
      return { success: false, error: 'Failed to update supplier information' }
    }

    revalidatePath('/inventory')
    return { success: true, data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Operation failed' }
  }
}
