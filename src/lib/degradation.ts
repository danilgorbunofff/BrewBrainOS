/**
 * BrewBrain OS — Degradation Metrics Calculation Engine
 * Core algorithms for ingredient freshness tracking:
 * - HSI (Hop Storage Index): How much hop alpha acid potency remains
 * - Grain Moisture: Percentage water content (affects yield & mold risk)
 * - PPG (Points Per Pound Per Gallon): Extract efficiency
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DegradationMetrics, StorageCondition, DegradationLog } from '@/types/database'

// Helper functions for date calculations (replaces date-fns)
function parseISO(dateString: string): Date {
  return new Date(dateString)
}

function differenceInDays(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Storage condition modifier for HSI degradation
 * Different storage conditions cause different degradation rates
 * Cool & Dry = baseline, Warm = accelerated
 */
function getStorageConditionMultiplier(condition: StorageCondition): number {
  const multipliers: Record<StorageCondition, number> = {
    'cool_dry': 1.0,      // Baseline (ideal storage)
    'cool_humid': 1.3,    // 30% faster degradation due to humidity
    'room_temp': 1.8,     // 80% faster degradation
    'warm': 2.5,          // 150% faster degradation (critical)
  }
  return multipliers[condition]
}

/**
 * Calculate current HSI based on storage time and conditions
 * 
 * Formula: HSI_current = HSI_initial × (1 - (monthly_loss_rate% × months_stored × condition_multiplier))
 * 
 * Example:
 * - Initial HSI: 100%
 * - Stored for 6 months in cool_dry condition
 * - Monthly loss: 0.15% (default)
 * - HSI_current = 100 × (1 - (0.0015 × 6 × 1.0)) = 100 × 0.991 = 99.1%
 * 
 * @param hsiInitial Initial hop potency (0-100)
 * @param receivedDate When the hops were received (ISO date string)
 * @param storageCondition Current storage environment
 * @param monthlyLossRate Monthly degradation rate (0.15% = 0.0015)
 * @returns Current HSI value (0-100), capped at 0
 */
export function calculateHSI(
  hsiInitial: number,
  receivedDate: string,
  storageCondition: StorageCondition,
  monthlyLossRate: number = 0.0015
): number {
  if (!hsiInitial || hsiInitial <= 0) return 0

  const today = new Date()
  const received = parseISO(receivedDate)
  const daysElapsed = differenceInDays(today, received)
  const monthsElapsed = daysElapsed / 30.44  // Average days per month

  const conditionMultiplier = getStorageConditionMultiplier(storageCondition)
  const hsiLoss = monthlyLossRate * monthsElapsed * conditionMultiplier
  const hsiCurrent = hsiInitial * (1 - hsiLoss)

  // Never go below 0
  return Math.max(0, Math.round(hsiCurrent * 100) / 100)
}

/**
 * Calculate grain moisture change over time
 * 
 * Grain absorbs/loses moisture based on storage conditions.
 * Optimal range: 8-12%
 * Below 8%: Brittle, may crack during milling
 * Above 14%: High mold risk, enzymatic degradation
 * 
 * @param moistureInitial Initial moisture content (%)
 * @param receivedDate When grain was received (ISO date)
 * @param storageCondition Current storage environment
 * @param currentMeasuredMoisture Optional: manually measured current moisture
 * @returns Current moisture percentage, clamped to 0-30%
 */
export function calculateGrainMoisture(
  moistureInitial: number,
  receivedDate: string,
  storageCondition: StorageCondition,
  currentMeasuredMoisture?: number
): number {
  // If manually measured, use that value (user's measurement takes precedence)
  if (currentMeasuredMoisture !== undefined && currentMeasuredMoisture !== null) {
    return Math.max(0, Math.min(30, currentMeasuredMoisture))
  }

  const today = new Date()
  const received = parseISO(receivedDate)
  const daysElapsed = differenceInDays(today, received)

  // Moisture change rate per day based on storage condition
  const dailyChangeRates: Record<StorageCondition, number> = {
    'cool_dry': -0.02,       // Slowly dehydrates
    'cool_humid': 0.01,      // Slowly absorbs moisture
    'room_temp': 0.03,       // Moderate moisture absorption
    'warm': 0.05,            // Rapid moisture absorption and risk of mold
  }

  const dailyRate = dailyChangeRates[storageCondition]
  const moistureChange = dailyRate * daysElapsed
  const moistureCurrent = moistureInitial + moistureChange

  // Clamp to realistic ranges (0-30%)
  return Math.max(0, Math.min(30, Math.round(moistureCurrent * 100) / 100))
}

/**
 * Calculate PPG (Points Per Pound Per Gallon)
 * 
 * PPG represents grain's extract potential per pound per gallon of water.
 * Defaults: 2-row malt ~37 PPG, Munich malt ~35 PPG
 * 
 * Degradation comes from:
 * 1. Enzyme deactivation (linked to moisture content)
 * 2. Mold/contamination (high moisture)
 * 3. Oxidation over time
 * 
 * @param ppgInitial Initial PPG value
 * @param hsiLossPct Percentage of HSI lost (0-100)
 * @param grainMoistureLoss Absolute change in moisture from initial
 * @returns Adjusted PPG value
 */
export function calculatePPG(
  ppgInitial: number,
  hsiLossPct: number,
  grainMoistureLoss: number
): number {
  if (!ppgInitial || ppgInitial <= 0) return 0

  let ppgCurrent = ppgInitial

  // HSI loss impacts PPG ~0.3% per 1% HSI loss (cross-ingredient effect minimal)
  const hsiImpact = (hsiLossPct / 100) * 0.003 * ppgInitial

  // Moisture loss impacts PPG more significantly
  // Over-dry (< 7%): enzyme deactivation, -0.2 PPG per % below 8%
  // Over-moist (> 13%): mold risk & enzyme damage, -0.5 PPG per % above 13%
  let moistureImpact = 0
  if (grainMoistureLoss < -1) {
    moistureImpact = Math.abs(grainMoistureLoss) * 0.2  // Over-dried
  } else if (grainMoistureLoss > 1) {
    moistureImpact = grainMoistureLoss * 0.5  // Over-moist
  }

  ppgCurrent = ppgCurrent - hsiImpact - moistureImpact

  // PPG never goes below 10% of original
  return Math.max(ppgInitial * 0.1, Math.round(ppgCurrent * 100) / 100)
}

/**
 * Determine degradation health status badge
 * Aggregates all metrics into a single health indicator
 */
export function getDegradationHealthStatus(
  hsi?: number | null,
  grainMoisture?: number | null,
  ppgLossPct?: number
): 'fresh' | 'degraded' | 'critical' {
  let issues = 0

  // HSI check
  if (hsi !== null && hsi !== undefined) {
    if (hsi < 75) issues++
    if (hsi < 50) issues++
    if (hsi < 30) issues++
  }

  // Moisture check
  if (grainMoisture !== null && grainMoisture !== undefined) {
    if (grainMoisture > 14 || grainMoisture < 7) issues++
    if (grainMoisture > 16 || grainMoisture < 5) issues += 2
  }

  // PPG loss check
  if (ppgLossPct !== undefined && ppgLossPct !== null) {
    if (ppgLossPct > 10) issues++
    if (ppgLossPct > 25) issues += 2
  }

  if (issues >= 3) return 'critical'
  if (issues >= 1) return 'degraded'
  return 'fresh'
}

/**
 * Calculate percentage loss from initial value
 */
function calculatePercentageLoss(initial: number | null | undefined, current: number | null | undefined): number {
  if (!initial || !current || initial <= 0) return 0
  return ((initial - current) / initial) * 100
}

/**
 * Recalculate all degradation metrics for an inventory item
 * Returns updated metrics and the change indicators
 */
export function recalculateDegradationMetrics(item: {
  hsi_initial?: number | null
  hsi_current?: number | null
  grain_moisture_initial?: number | null
  grain_moisture_current?: number | null
  ppg_initial?: number | null
  ppg_current?: number | null
  received_date: string
  storage_condition: StorageCondition
}): {
  hsi_current: number | null
  grain_moisture_current: number | null
  ppg_current: number | null
  hsi_loss_pct: number
  moisture_loss_pct: number
  ppg_loss_pct: number
} {
  let hsi_current: number | null = null
  let grain_moisture_current: number | null = null
  let ppg_current: number | null = null

  // Calculate HSI if applicable (hops)
  if (item.hsi_initial && item.hsi_initial > 0) {
    hsi_current = calculateHSI(item.hsi_initial, item.received_date, item.storage_condition)
  }

  // Calculate grain moisture if applicable (grain)
  if (item.grain_moisture_initial !== null && item.grain_moisture_initial !== undefined) {
    grain_moisture_current = calculateGrainMoisture(
      item.grain_moisture_initial,
      item.received_date,
      item.storage_condition
    )
  }

  // Calculate PPG if applicable (grain)
  if (item.ppg_initial && item.ppg_initial > 0) {
    const hsiLoss = hsi_current ? calculatePercentageLoss(item.hsi_initial, hsi_current) : 0
    const moistureLoss = grain_moisture_current && item.grain_moisture_initial
      ? grain_moisture_current - item.grain_moisture_initial
      : 0
    ppg_current = calculatePPG(item.ppg_initial, hsiLoss, moistureLoss)
  }

  return {
    hsi_current,
    grain_moisture_current,
    ppg_current,
    hsi_loss_pct: calculatePercentageLoss(item.hsi_initial, hsi_current),
    moisture_loss_pct: calculatePercentageLoss(item.grain_moisture_initial, grain_moisture_current),
    ppg_loss_pct: calculatePercentageLoss(item.ppg_initial, ppg_current),
  }
}

/**
 * Determine if degradation metrics warrant alerts
 * Returns alert messages if thresholds are crossed
 */
export function generateDegradationAlerts(metrics: {
  item_type?: string
  hsi_current?: number | null
  grain_moisture_current?: number | null
  ppg_current?: number | null
  ppg_initial?: number | null
}): Array<{ level: 'warning' | 'critical'; message: string }> {
  const alerts: Array<{ level: 'warning' | 'critical'; message: string }> = []

  // HSI alerts (hops)
  if (metrics.hsi_current !== null && metrics.hsi_current !== undefined) {
    if (metrics.hsi_current < 30) {
      alerts.push({
        level: 'critical',
        message: 'HSI critically low (<30%). Hops severely degraded, IBU yield significantly reduced.',
      })
    } else if (metrics.hsi_current < 75) {
      alerts.push({
        level: 'warning',
        message: `HSI at ${metrics.hsi_current}%. Expect ~${100 - metrics.hsi_current}% reduction in IBU contribution.`,
      })
    }
  }

  // Moisture alerts (grain)
  if (metrics.grain_moisture_current !== null && metrics.grain_moisture_current !== undefined) {
    if (metrics.grain_moisture_current > 15) {
      alerts.push({
        level: 'critical',
        message: 'Grain moisture critically high (>15%). High mold risk. Consider disposal.',
      })
    } else if (metrics.grain_moisture_current > 13) {
      alerts.push({
        level: 'warning',
        message: `Grain moisture at ${metrics.grain_moisture_current}%. Mold risk detected, improve storage conditions.`,
      })
    } else if (metrics.grain_moisture_current < 6) {
      alerts.push({
        level: 'warning',
        message: `Grain too dry (${metrics.grain_moisture_current}%). Risk of brittleness during milling.`,
      })
    }
  }

  // PPG loss alerts (grain)
  if (metrics.ppg_current != null && metrics.ppg_initial && metrics.ppg_initial > 0) {
    const ppgLossPct = ((metrics.ppg_initial - metrics.ppg_current) / metrics.ppg_initial) * 100
    if (ppgLossPct > 25) {
      alerts.push({
        level: 'critical',
        message: `PPG reduced by ${ppgLossPct.toFixed(1)}%. Grain yield severely compromised. Adjust recipe.`,
      })
    } else if (ppgLossPct > 10) {
      alerts.push({
        level: 'warning',
        message: `PPG reduced by ${ppgLossPct.toFixed(1)}%. Consider adjusting grain quantity in recipes.`,
      })
    }
  }

  return alerts
}

/**
 * Format a DegradationChangeReason value for human-readable display
 */
export function formatDegradationChangeReason(reason: import('@/types/database').DegradationChangeReason): string {
  const labels: Record<import('@/types/database').DegradationChangeReason, string> = {
    auto_calc: 'Auto-calculated',
    manual_input: 'Manual input',
    storage_change: 'Storage change',
    quality_test: 'Quality test',
  }
  return labels[reason]
}

/**
 * Format degradation metrics for display
 */
export function formatDegradationMetrics(metrics: Partial<DegradationMetrics>) {
  return {
    hsi: metrics.hsi_current ? `${metrics.hsi_current.toFixed(1)}%` : '—',
    moisture: metrics.grain_moisture_current ? `${metrics.grain_moisture_current.toFixed(1)}%` : '—',
    ppg: metrics.ppg_current ? `${metrics.ppg_current.toFixed(0)}` : '—',
  }
}
