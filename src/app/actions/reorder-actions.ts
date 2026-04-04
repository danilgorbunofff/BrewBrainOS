'use server'

import { createClient } from '@/utils/supabase/server'
import { sendReorderNotification } from '@/app/actions/push-actions'
import { classifyReorderAlert, type ReorderAlertInput, type ReorderAlertResult } from '@/lib/reorder'

/**
 * Check if reorder point has been breached and create alert if needed
 * Called whenever inventory is adjusted
 */
export async function checkAndCreateReorderAlert(
  input: ReorderAlertInput
): Promise<ReorderAlertResult> {
  const supabase = await createClient()

  // Get inventory item to check suppression and usage data
  const { data: inventoryItem } = await supabase
    .from('inventory')
    .select('suppress_reorder_alerts, avg_weekly_usage')
    .eq('id', input.inventoryItemId)
    .single()

  // Skip if alerts are suppressed for this item
  if (inventoryItem?.suppress_reorder_alerts) {
    return {
      alertCreated: false,
      alertType: 'reorder_point_hit',
      severity: 'info',
      message: 'Alerts suppressed for this item',
    }
  }

  // Classify the alert
  const { type, severity, daysUntilStockout } = classifyReorderAlert(
    input.currentQuantity,
    input.reorderPoint,
    input.avgWeeklyUsage || inventoryItem?.avg_weekly_usage || undefined
  )

  // If quantity is above reorder point and no existing alert, no need to create
  if (input.currentQuantity > input.reorderPoint) {
    return {
      alertCreated: false,
      alertType: type,
      severity: severity,
      message: `Stock level is healthy (${input.currentQuantity} > ${input.reorderPoint})`,
    }
  }

  // Check if alert already exists
  const { data: existingAlert } = await supabase
    .from('reorder_alerts')
    .select('id')
    .eq('brewery_id', input.breweryId)
    .eq('inventory_item_id', input.inventoryItemId)
    .in('status', ['open', 'acknowledged'])
    .maybeSingle()

  // Don't create duplicate alerts
  if (existingAlert) {
    return {
      alertCreated: false,
      alertId: existingAlert.id,
      alertType: type,
      severity: severity,
      daysUntilStockout,
      message: 'Alert already exists for this item',
    }
  }

  // Get current user ID
  const { data: userData } = await supabase.auth.getUser()

  // Create the alert
  const { data: newAlert, error } = await supabase
    .from('reorder_alerts')
    .insert([
      {
        brewery_id: input.breweryId,
        inventory_item_id: input.inventoryItemId,
        alert_type: type,
        severity,
        status: 'open',
        current_quantity: input.currentQuantity,
        reorder_point: input.reorderPoint,
        units_to_reorder: Math.max(
          Math.ceil(input.reorderPoint * 2),
          Math.ceil(input.reorderPoint)
        ),
        estimated_stockout_days: daysUntilStockout,
        last_order_date: input.lastOrderDate,
        created_by: userData.user?.id,
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create reorder alert:', error)
    return {
      alertCreated: false,
      alertType: type,
      severity,
      daysUntilStockout,
      message: `Failed to create alert: ${error.message}`,
    }
  }

  // Send push notification
  await sendReorderNotification(
    input.breweryId,
    input.itemName,
    severity,
    input.currentQuantity,
    input.reorderPoint,
    daysUntilStockout
  )

  return {
    alertCreated: true,
    alertId: newAlert?.id,
    alertType: type,
    severity,
    daysUntilStockout,
    message: `Reorder alert created: ${input.itemName} is ${severity}`,
  }
}

/**
 * Mark an alert as acknowledged (user has seen/read it)
 */
export async function acknowledgeReorderAlert(alertId: string): Promise<void> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('reorder_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userData.user?.id,
    })
    .eq('id', alertId)

  if (error) {
    throw new Error(`Failed to acknowledge alert: ${error.message}`)
  }
}

/**
 * Mark an alert as resolved (item has been reordered)
 */
export async function resolveReorderAlert(alertId: string, notes?: string): Promise<void> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('reorder_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: userData.user?.id,
      resolution_notes: notes,
    })
    .eq('id', alertId)

  if (error) {
    throw new Error(`Failed to resolve alert: ${error.message}`)
  }
}

/**
 * Get active reorder alerts for a brewery
 */
export async function getReorderAlerts(
  breweryId: string,
  filter?: 'open' | 'acknowledged' | 'all'
) {
  const supabase = await createClient()

  let query = supabase
    .from('reorder_alerts')
    .select(
      `
      id,
      alert_type,
      severity,
      status,
      current_quantity,
      reorder_point,
      units_to_reorder,
      estimated_stockout_days,
      created_at,
      acknowledged_at,
      resolved_at,
      inventory_item:inventory_item_id(id, name, unit_type, supplier_id)
    `
    )
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false })

  if (filter === 'all') {
    // Include all statuses
  } else if (filter) {
    query = query.eq('status', filter)
  } else {
    // Default: show open and acknowledged
    query = query.in('status', ['open', 'acknowledged'])
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch reorder alerts:', error)
    return []
  }

  return data || []
}

/**
 * Get summary stats for reorder alerts
 */
export async function getReorderAlertsSummary(breweryId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reorder_alerts')
    .select('severity, status')
    .eq('brewery_id', breweryId)
    .in('status', ['open', 'acknowledged'])

  if (error) {
    console.error('Failed to fetch alert summary:', error)
    return {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    }
  }

  const alerts = data || []
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }
}

/**
 * Update inventory item's reorder attributes
 */
export async function updateInventoryReorderSettings(
  inventoryItemId: string,
  settings: {
    reorderPoint?: number
    minOrderQuantity?: number
    leadTimeDays?: number
    avgWeeklyUsage?: number
    suppressAlerts?: boolean
  }
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory')
    .update({
      reorder_point: settings.reorderPoint,
      min_order_quantity: settings.minOrderQuantity,
      lead_time_days: settings.leadTimeDays,
      avg_weekly_usage: settings.avgWeeklyUsage,
      suppress_reorder_alerts: settings.suppressAlerts,
    })
    .eq('id', inventoryItemId)

  if (error) {
    throw new Error(`Failed to update inventory settings: ${error.message}`)
  }
}

/**
 * Get reorder point history for an inventory item
 */
export async function getReorderPointHistory(inventoryItemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reorder_point_history')
    .select('*')
    .eq('inventory_item_id', inventoryItemId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch reorder point history:', error)
    return []
  }

  return data || []
}

/**
 * Suppress reorder alerts for an item (seasonal items, archived items, etc.)
 */
export async function suppressReorderAlerts(inventoryItemId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory')
    .update({ suppress_reorder_alerts: true })
    .eq('id', inventoryItemId)

  if (error) {
    throw new Error(`Failed to suppress alerts: ${error.message}`)
  }
}

/**
 * Re-enable reorder alerts for an item
 */
export async function enableReorderAlerts(inventoryItemId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory')
    .update({ suppress_reorder_alerts: false })
    .eq('id', inventoryItemId)

  if (error) {
    throw new Error(`Failed to enable alerts: ${error.message}`)
  }
}
