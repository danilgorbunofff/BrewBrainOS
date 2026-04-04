'use server'

/**
 * Shrinkage Alert Server Actions
 * Handles recording inventory changes, calculating baselines, and detecting anomalies
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveBrewery } from '@/lib/active-brewery'
import { detectShrinkageAnomaly, calculateShrinkageBaseline } from '@/lib/shrinkage'
import { checkAndCreateReorderAlert } from '@/app/actions/reorder-actions'
import { InventoryHistory, ShrinkageAlert, ActionResult } from '@/types/database'

/**
 * Record an inventory stock change (stock adjustment, recipe usage, receipt, waste)
 * This creates an audit trail and triggers baseline calculation
 */
export async function recordInventoryChange(
  inventory_id: string,
  previous_stock: number,
  current_stock: number,
  change_type: 'stock_adjustment' | 'recipe_usage' | 'received' | 'waste' | 'other' = 'stock_adjustment',
  reason?: string,
  batch_id?: string
): Promise<ActionResult<InventoryHistory>> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const quantity_change = current_stock - previous_stock

    // Determine who recorded this
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('inventory_history')
      .insert({
        inventory_id,
        brewery_id: brewery.id,
        previous_stock,
        current_stock,
        quantity_change,
        change_type,
        reason,
        batch_id,
        recorded_by: user?.id,
      })
      .select()
      .single()

    if (error) throw error

    // Trigger baseline recalculation for this item
    await recalculateShrinkageBaseline(inventory_id)

    // Check for anomalies
    await detectAndCreateShrinkageAlert(inventory_id)

    // Check reorder point
    await checkReorderPoint(inventory_id, brewery.id, current_stock)

    revalidatePath('/inventory')
    return { success: true, data }
  } catch (e: any) {
    console.error('Failed to record inventory change:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Recalculate shrinkage baseline for an inventory item
 * Based on last 90 days of history
 */
export async function recalculateShrinkageBaseline(inventory_id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    // Get inventory details
    const { data: inventoryData, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', inventory_id)
      .eq('brewery_id', brewery.id)
      .single()

    if (invError) throw new Error('Inventory not found')

    // Get history for last 90 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const { data: history, error: histError } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('inventory_id', inventory_id)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (histError) throw histError

    const baselineMetrics = calculateShrinkageBaseline(history || [], 90)

    // Update or create baseline record
    const { data: existing } = await supabase
      .from('shrinkage_baselines')
      .select('id')
      .eq('inventory_id', inventory_id)
      .single()

    if (existing) {
      const { error: updateError } = await supabase
        .from('shrinkage_baselines')
        .update({
          ...baselineMetrics,
          sample_count: baselineMetrics.sample_count,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('inventory_id', inventory_id)

      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from('shrinkage_baselines')
        .insert({
          inventory_id,
          brewery_id: brewery.id,
          analysis_period_days: 90,
          average_monthly_loss: baselineMetrics.average_monthly_loss,
          monthly_loss_std_dev: baselineMetrics.monthly_loss_std_dev,
          median_loss_percentage: baselineMetrics.median_loss_percentage,
          sample_count: baselineMetrics.sample_count,
          loss_threshold_warning: 5,
          loss_threshold_critical: 15,
          variance_multiplier: 2.5,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) throw insertError
    }

    return { success: true, data: baselineMetrics }
  } catch (e: any) {
    console.error('Failed to recalculate shrinkage baseline:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Detect anomalies and create alert if shrinkage is detected
 */
export async function detectAndCreateShrinkageAlert(inventory_id: string): Promise<ActionResult<ShrinkageAlert | null>> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    // Get inventory item
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', inventory_id)
      .eq('brewery_id', brewery.id)
      .single()

    if (invError) throw new Error('Inventory not found')

    // Get shrinkage baseline
    const { data: baseline, error: baseError } = await supabase
      .from('shrinkage_baselines')
      .select('*')
      .eq('inventory_id', inventory_id)
      .single()

    if (baseError) {
      // No baseline yet, skip detection
      return { success: true, data: null }
    }

    // Get recent history
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // Last 30 days

    const { data: history, error: histError } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('inventory_id', inventory_id)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (histError) throw histError

    // Calculate expected stock based on received amount and usage
    // For now, we'll use a simple approach: track actual vs. recorded
    const totalUsed = (history || [])
      .filter((h: any) => h.quantity_change < 0)
      .reduce((sum: number, h: any) => sum + Math.abs(h.quantity_change), 0)

    const expectedStock = inventory.current_stock + totalUsed

    // Run anomaly detection
    const alert = detectShrinkageAnomaly(
      inventory_id,
      inventory.name,
      expectedStock,
      inventory.current_stock,
      history || [],
      {
        average_monthly_loss: baseline.average_monthly_loss,
        monthly_loss_std_dev: baseline.monthly_loss_std_dev,
        loss_threshold_warning: baseline.loss_threshold_warning,
        loss_threshold_critical: baseline.loss_threshold_critical,
      }
    )

    if (!alert) {
      return { success: true, data: null }
    }

    // Check if alert already exists for recent period (avoid duplicates)
    const { data: existingAlert } = await supabase
      .from('shrinkage_alerts')
      .select('id')
      .eq('inventory_id', inventory_id)
      .eq('status', 'unresolved')
      .gte('detected_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .single()

    if (existingAlert) {
      return { success: true, data: null } // Alert already exists
    }

    // Create alert record
    const { data: createdAlert, error: createError } = await supabase
      .from('shrinkage_alerts')
      .insert({
        ...alert,
        brewery_id: brewery.id,
      })
      .select()
      .single()

    if (createError) throw createError

    revalidatePath('/inventory')
    return { success: true, data: createdAlert }
  } catch (e: any) {
    console.error('Failed to detect shrinkage anomaly:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Get unresolved shrinkage alerts for a brewery
 */
export async function getShrinkageAlerts(status?: string): Promise<ActionResult<ShrinkageAlert[]>> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    let query = supabase
      .from('shrinkage_alerts')
      .select(`
        *,
        inventory:inventory_id(name, item_type, unit)
      `)
      .eq('brewery_id', brewery.id)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('detected_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (e: any) {
    console.error('Failed to get shrinkage alerts:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Update shrinkage alert status
 */
export async function updateShrinkageAlertStatus(
  alert_id: string,
  status: 'unresolved' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive',
  notes?: string,
  assigned_to?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    const updateData: any = {
      status,
      notes,
    }

    if (assigned_to) {
      updateData.assigned_to = assigned_to
    }

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('shrinkage_alerts')
      .update(updateData)
      .eq('id', alert_id)
      .eq('brewery_id', brewery.id)

    if (error) throw error

    revalidatePath('/inventory')
    return { success: true, data: null }
  } catch (e: any) {
    console.error('Failed to update shrinkage alert:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Get shrinkage statistics for a brewery
 */
export async function getShrinkageStats(): Promise<
  ActionResult<{
    total_alerts: number
    critical_alerts: number
    this_month_loss: number
    average_monthly_loss: number
  }>
> {
  try {
    const supabase = await createClient()
    const brewery = await getActiveBrewery()
    if (!brewery) return { success: false, error: 'No active brewery' }

    // Get alert counts
    const { data: alerts } = await supabase
      .from('shrinkage_alerts')
      .select('severity')
      .eq('brewery_id', brewery.id)
      .eq('status', 'unresolved')

    const critical_alerts = (alerts || []).filter((a: any) => a.severity === 'critical').length

    // Get monthly loss sum
    const thisMonth = new Date()
    thisMonth.setDate(1)

    const { data: thisMonthHistory } = await supabase
      .from('inventory_history')
      .select('quantity_change')
      .eq('brewery_id', brewery.id)
      .gte('created_at', thisMonth.toISOString())
      .lte('quantity_change', 0)

    const this_month_loss = (thisMonthHistory || []).reduce(
      (sum: number, h: any) => sum + Math.abs(h.quantity_change),
      0
    )

    // Get average monthly loss from baselines
    const { data: baselines } = await supabase
      .from('shrinkage_baselines')
      .select('average_monthly_loss')
      .eq('brewery_id', brewery.id)

    const average_monthly_loss =
      (baselines || []).reduce((sum: number, b: any) => sum + (b.average_monthly_loss || 0), 0) /
        Math.max(1, baselines?.length || 1) || 0

    return {
      success: true,
      data: {
        total_alerts: alerts?.length || 0,
        critical_alerts,
        this_month_loss: Math.round(this_month_loss * 100) / 100,
        average_monthly_loss: Math.round(average_monthly_loss * 100) / 100,
      },
    }
  } catch (e: any) {
    console.error('Failed to get shrinkage stats:', e)
    return {
      success: false,
      error: e.message,
    }
  }
}

/**
 * Check if inventory item has hit reorder point and create alert if needed
 */
async function checkReorderPoint(
  inventory_id: string,
  brewery_id: string,
  current_quantity: number
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get inventory item details
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('name, unit_type, reorder_point, avg_weekly_usage')
      .eq('id', inventory_id)
      .eq('brewery_id', brewery_id)
      .single()

    if (invError || !inventory) {
      console.error('Failed to fetch inventory for reorder check:', invError)
      return
    }

    // Skip if no reorder point set
    if (!inventory.reorder_point || inventory.reorder_point <= 0) {
      return
    }

    // Check and create reorder alert
    await checkAndCreateReorderAlert({
      breweryId: brewery_id,
      inventoryItemId: inventory_id,
      currentQuantity: current_quantity,
      reorderPoint: inventory.reorder_point,
      itemName: inventory.name,
      unitType: inventory.unit_type,
      avgWeeklyUsage: inventory.avg_weekly_usage,
    })
  } catch (error) {
    console.error('Failed to check reorder point:', error)
    // Don't throw - continue with other operations even if reorder check fails
  }
}
