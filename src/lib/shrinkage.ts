/**
 * BrewBrain OS — Shrinkage Detection Engine
 * Anomaly detection algorithms for identifying unusual inventory losses
 *
 * Techniques used:
 * 1. Statistical Z-score detection: Identifies outlier losses
 * 2. Baseline comparison: Detects when loss exceeds expected range
 * 3. Pattern recognition: Identifies gradual degradation vs sudden spikes
 * 4. Variance analysis: Detects inconsistent/volatile stock levels
 */

import { ShrinkageAlert, ShrinkageSeverity, ShrinkageAlertType } from '@/types/database'
import { InventoryHistory } from '@/types/database'

interface HistoryWindow {
  start_date: Date
  end_date: Date
  history: InventoryHistory[]
}

interface AnomalyScore {
  z_score: number
  is_anomaly: boolean
  severity: ShrinkageSeverity
  alert_type: ShrinkageAlertType
  confidence: number
}

/**
 * Calculate basic statistics from a dataset
 */
function calculateStats(values: number[]): { mean: number; std_dev: number; median: number } {
  if (values.length === 0) return { mean: 0, std_dev: 0, median: 0 }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  const std_dev = Math.sqrt(variance)

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return { mean, std_dev, median }
}

/**
 * Calculate Z-score for statistical anomaly detection
 * Z-score tells us how many standard deviations away from the mean
 * |Z| > 2.5 is typically considered an anomaly (99.4% confidence)
 */
function calculateZScore(value: number, mean: number, std_dev: number): number {
  if (std_dev === 0) return 0
  return (value - mean) / std_dev
}

/**
 * Detect unusual single loss events
 * Identifies large drops that don't match the pattern
 */
function detectUnusualSingleLoss(
  history: InventoryHistory[],
  current_stock: number,
  expected_stock: number,
  baseline: { mean_loss: number; std_dev: number }
): AnomalyScore | null {
  if (history.length < 3) return null

  // Get recent losses (last 10 entries)
  const recentLosses = history
    .slice(0, 10)
    .filter((h) => h.quantity_change < 0)
    .map((h) => Math.abs(h.quantity_change))

  if (recentLosses.length === 0) return null

  const { mean: recentMean, std_dev: recentStdDev } = calculateStats(recentLosses)
  const latestLoss = Math.abs(history[0]?.quantity_change || 0)

  if (latestLoss === 0) return null

  const z_score = calculateZScore(latestLoss, recentMean, recentStdDev)

  if (Math.abs(z_score) > 2.0) {
    const loss_percentage = (latestLoss / expected_stock) * 100

    return {
      z_score,
      is_anomaly: true,
      severity: categorizeByLossPercentage(loss_percentage),
      alert_type: 'unusual_single_loss',
      confidence: Math.min(100, 70 + Math.abs(z_score) * 10),
    }
  }

  return null
}

/**
 * Detect pattern degradation
 * Identifies consistent gradual losses that suggest leaks, evaporation, or systematic theft
 */
function detectPatternDegradation(
  history: InventoryHistory[],
  lookback_days: number = 30
): AnomalyScore | null {
  if (history.length < 5) return null

  // Filter to entries within the lookback period
  const now = new Date()
  const cutoff = new Date(now.getTime() - lookback_days * 24 * 60 * 60 * 1000)
  const recent = history.filter((h) => new Date(h.created_at) >= cutoff)

  if (recent.length < 3) return null

  const losses = recent.filter((h) => h.quantity_change < 0).map((h) => Math.abs(h.quantity_change))

  if (losses.length < 2) return null

  // Check for consistent downward trend
  const { mean: meanLoss, std_dev: lossStdDev } = calculateStats(losses)

  // Low variance + consistent negative = gradual leak/evaporation pattern
  const coefficient_of_variation = lossStdDev / meanLoss
  if (coefficient_of_variation < 0.5 && meanLoss > 0) {
    // Consistent pattern detected
    const totalLossPercentage = (losses.reduce((a, b) => a + b, 0) / (meanLoss * losses.length)) * 100

    return {
      z_score: 0,
      is_anomaly: true,
      severity: 'medium',
      alert_type: 'pattern_degradation',
      confidence: Math.min(100, 50 + losses.length * 10),
    }
  }

  return null
}

/**
 * Detect sudden spikes
 * Identifies abrupt changes that differ significantly from baseline
 */
function detectSuddenSpike(
  history: InventoryHistory[],
  baseline: { mean_loss: number; std_dev: number }
): AnomalyScore | null {
  if (history.length < 2) return null

  const latest = history[0]
  const loss = Math.abs(latest.quantity_change)

  if (loss === 0) return null

  // Compare to baseline
  const deviation = loss - baseline.mean_loss
  const z_score = calculateZScore(loss, baseline.mean_loss, baseline.std_dev)

  if (Math.abs(z_score) > 1.5 && deviation > baseline.mean_loss * 2) {
    return {
      z_score,
      is_anomaly: true,
      severity: 'high',
      alert_type: 'sudden_spike',
      confidence: 75,
    }
  }

  return null
}

/**
 * Detect high variance in stock levels
 * Identifies inconsistent pattern suggesting data entry errors or tracking issues
 */
function detectHighVariance(history: InventoryHistory[]): AnomalyScore | null {
  if (history.length < 5) return null

  const changes = history.map((h) => h.quantity_change)
  const { std_dev: changeStdDev, mean: changeMean } = calculateStats(changes)

  // High variance means unpredictable pattern
  if (changeStdDev > Math.abs(changeMean) * 2 && changeStdDev > 0) {
    return {
      z_score: 0,
      is_anomaly: true,
      severity: 'medium',
      alert_type: 'high_variance',
      confidence: 60,
    }
  }

  return null
}

/**
 * Map loss percentage to severity level
 */
function categorizeByLossPercentage(lossPercentage: number): ShrinkageSeverity {
  if (lossPercentage < 5) return 'low'
  if (lossPercentage < 15) return 'medium'
  if (lossPercentage < 30) return 'high'
  return 'critical'
}

/**
 * Main anomaly detection function
 * Combines multiple detection techniques to identify shrinkage
 */
export function detectShrinkageAnomaly(
  inventory_id: string,
  inventory_name: string,
  expected_stock: number,
  actual_stock: number,
  history: InventoryHistory[],
  baseline: {
    average_monthly_loss: number
    monthly_loss_std_dev: number
    loss_threshold_warning: number
    loss_threshold_critical: number
  }
): ShrinkageAlert | null {
  const loss_amount = expected_stock - actual_stock
  const loss_percentage = expected_stock > 0 ? (loss_amount / expected_stock) * 100 : 0

  // If no actual loss, no alert needed
  if (loss_amount <= 0) return null

  // Check against thresholds
  if (loss_percentage < baseline.loss_threshold_warning) {
    return null // Below warning threshold
  }

  // Run multiple detection algorithms
  const baselineStats = {
    mean_loss: baseline.average_monthly_loss,
    std_dev: baseline.monthly_loss_std_dev,
  }

  let selectedAnomaly: AnomalyScore | null = null
  let highestConfidence = 0

  // Try each detection method
  const detections = [
    detectUnusualSingleLoss(history, actual_stock, expected_stock, baselineStats),
    detectPatternDegradation(history),
    detectSuddenSpike(history, baselineStats),
    detectHighVariance(history),
  ].filter((d) => d !== null) as AnomalyScore[]

  // Select the detection with highest confidence
  for (const detection of detections) {
    if (detection.confidence > highestConfidence) {
      highestConfidence = detection.confidence
      selectedAnomaly = detection
    }
  }

  // If no specific pattern detected but loss exceeds threshold
  if (!selectedAnomaly) {
    selectedAnomaly = {
      z_score: 0,
      is_anomaly: true,
      severity: categorizeByLossPercentage(loss_percentage),
      alert_type: 'variance_threshold_exceeded',
      confidence: 50,
    }
  }

  return {
    id: `alert_${Date.now()}`, // Will be generated by DB
    inventory_id,
    brewery_id: '', // Will be filled by caller
    severity: selectedAnomaly.severity,
    alert_type: selectedAnomaly.alert_type,
    expected_stock,
    actual_stock,
    loss_amount,
    loss_percentage: Math.round(loss_percentage * 100) / 100,
    average_monthly_loss: baseline.average_monthly_loss,
    z_score: selectedAnomaly.z_score,
    confidence_score: selectedAnomaly.confidence,
    status: 'unresolved',
    detected_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
}

/**
 * Calculate baseline metrics from historical data
 * Used for establishing normal loss patterns
 */
export function calculateShrinkageBaseline(
  history: InventoryHistory[],
  lookback_days: number = 90
): {
  average_monthly_loss: number
  monthly_loss_std_dev: number
  median_loss_percentage: number
  sample_count: number
} {
  if (history.length === 0) {
    return {
      average_monthly_loss: 0,
      monthly_loss_std_dev: 0,
      median_loss_percentage: 0,
      sample_count: 0,
    }
  }

  // Filter to lookback period
  const now = new Date()
  const cutoff = new Date(now.getTime() - lookback_days * 24 * 60 * 60 * 1000)
  const filtered = history.filter((h) => new Date(h.created_at) >= cutoff)

  // Extract losses (negative quantities)
  const losses = filtered
    .filter((h) => h.quantity_change < 0)
    .map((h) => Math.abs(h.quantity_change))

  if (losses.length === 0) {
    return {
      average_monthly_loss: 0,
      monthly_loss_std_dev: 0,
      median_loss_percentage: 0,
      sample_count: 0,
    }
  }

  const { mean, std_dev, median } = calculateStats(losses)

  // Annualize to monthly if looking at 90 days
  const monthsInPeriod = lookback_days / 30.44
  const average_monthly_loss = mean / monthsInPeriod

  return {
    average_monthly_loss,
    monthly_loss_std_dev: std_dev / monthsInPeriod,
    median_loss_percentage: median,
    sample_count: losses.length,
  }
}

/**
 * Determine if an inventory item should trigger alerts
 * Some items naturally have high loss rates (e.g., liquid items due to evaporation)
 */
export function shouldMonitorForShrinkage(
  item_type: string,
  initial_stock: number,
  loss_history_months: number
): boolean {
  // Always monitor - managers should be aware of all losses
  // But could customize thresholds by item type
  return true
}
