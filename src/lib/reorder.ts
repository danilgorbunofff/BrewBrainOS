export type ReorderAlertType = 'reorder_point_hit' | 'critical_low' | 'stockout_imminent'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface ReorderAlertInput {
  breweryId: string
  inventoryItemId: string
  currentQuantity: number
  reorderPoint: number
  itemName: string
  unitType: string
  lastOrderDate?: string
  avgWeeklyUsage?: number
}

export interface ReorderAlertResult {
  alertCreated: boolean
  alertId?: string
  alertType: ReorderAlertType
  severity: AlertSeverity
  daysUntilStockout?: number
  message: string
}

/**
 * Determines alert type and severity based on quantities and usage patterns
 * Returns classification to determine if and how to alert
 * (Pure utility function - not a Server Action)
 */
export function classifyReorderAlert(
  current: number,
  reorder: number,
  avgWeeklyUsage?: number
): { type: ReorderAlertType; severity: AlertSeverity; daysUntilStockout?: number } {
  // Stock is depleted - immediate critical alert
  if (current <= 0) {
    return {
      type: 'stockout_imminent',
      severity: 'critical',
      daysUntilStockout: 0,
    }
  }

  // If we have usage data, calculate days remaining
  if (avgWeeklyUsage && avgWeeklyUsage > 0) {
    const daysRemaining = (current / avgWeeklyUsage) * 7

    // Less than 3 days worth of stock
    if (daysRemaining <= 3) {
      return {
        type: 'stockout_imminent',
        severity: 'critical',
        daysUntilStockout: Math.ceil(daysRemaining),
      }
    }

    // Less than 1 week worth of stock
    if (daysRemaining <= 7) {
      return {
        type: 'critical_low',
        severity: 'warning',
        daysUntilStockout: Math.ceil(daysRemaining),
      }
    }
  }

  // Percentage-based: less than 50% of reorder point
  const percentageOfReorder = (current / reorder) * 100
  if (percentageOfReorder <= 50) {
    return {
      type: 'critical_low',
      severity: 'warning',
    }
  }

  // Just hit the reorder point
  return {
    type: 'reorder_point_hit',
    severity: 'info',
  }
}
