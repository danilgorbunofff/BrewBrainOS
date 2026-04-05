/**
 * BrewBrain OS — Fermentation Alert Detection Engine
 * Pure TypeScript logic — no DB access, pure calc.
 *
 * Detects:
 *  1. Stuck fermentation  — gravity unchanged > 0.001 over last 48h
 *  2. Temperature deviation — reading ±2°C from batch target_temp
 *  3. pH out of range — reading outside 4.0–5.5
 *  4. DO spike — dissolved oxygen > 0.3 ppm post-pitch
 *  5. Over-pressure — PSI > 15 (configurable)
 */

import { FermentationAlertType, FermentationAlertSeverity } from '@/types/database'

// ─────────────────────────────────────────────
// INPUT TYPES
// ─────────────────────────────────────────────

export interface BatchReadingInput {
  id: string
  gravity?: number | null
  temperature?: number | null
  ph?: number | null
  dissolved_oxygen?: number | null
  pressure?: number | null
  created_at: string
}

export interface BatchConfig {
  /** Target fermentation temperature in °C */
  target_temp?: number | null
  /** Max allowed PSI before over-pressure alert */
  max_pressure_psi?: number | null
}

// ─────────────────────────────────────────────
// OUTPUT TYPE
// ─────────────────────────────────────────────

export interface DetectedAlert {
  alert_type: FermentationAlertType
  severity: FermentationAlertSeverity
  message: string
  threshold_value: number | null
  actual_value: number | null
}

// ─────────────────────────────────────────────
// THRESHOLDS (all configurable via config param)
// ─────────────────────────────────────────────

const DEFAULTS = {
  STUCK_GRAVITY_DELTA: 0.001,    // must change by at least this
  STUCK_WINDOW_HOURS: 48,
  TEMP_DEVIATION_C: 2,           // ±°C from target
  PH_MIN: 4.0,
  PH_MAX: 5.5,
  DO_SPIKE_PPM: 0.3,
  OVER_PRESSURE_PSI: 15,
}

// ─────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Stuck fermentation: gravity hasn't changed by >0.001 in the last 48h.
 * Requires at least 2 readings within the window.
 */
function detectStuckFermentation(readings: BatchReadingInput[]): DetectedAlert | null {
  const windowMs = DEFAULTS.STUCK_WINDOW_HOURS * 60 * 60 * 1000
  const cutoff = Date.now() - windowMs

  const recent = readings
    .filter((r) => new Date(r.created_at).getTime() >= cutoff && r.gravity != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (recent.length < 2) return null

  const latest = recent[0].gravity!
  const oldest = recent[recent.length - 1].gravity!
  const delta = Math.abs(latest - oldest)

  if (delta < DEFAULTS.STUCK_GRAVITY_DELTA) {
    return {
      alert_type: 'stuck_fermentation',
      severity: 'warning',
      message: `Gravity has not changed by more than ${DEFAULTS.STUCK_GRAVITY_DELTA} in the last ${DEFAULTS.STUCK_WINDOW_HOURS}h (${oldest.toFixed(3)} → ${latest.toFixed(3)}).`,
      threshold_value: DEFAULTS.STUCK_GRAVITY_DELTA,
      actual_value: delta,
    }
  }

  return null
}

/**
 * Temperature deviation: latest reading is ±2°C from batch target_temp.
 */
function detectTemperatureDeviation(
  readings: BatchReadingInput[],
  config: BatchConfig
): DetectedAlert | null {
  if (!config.target_temp) return null

  const latestReading = readings
    .filter((r) => r.temperature != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  if (!latestReading) return null

  const deviation = Math.abs(latestReading.temperature! - config.target_temp)

  if (deviation > DEFAULTS.TEMP_DEVIATION_C) {
    const direction = latestReading.temperature! > config.target_temp ? 'above' : 'below'
    const severity: FermentationAlertSeverity = deviation > DEFAULTS.TEMP_DEVIATION_C * 2 ? 'critical' : 'warning'

    return {
      alert_type: 'temperature_deviation',
      severity,
      message: `Temperature is ${latestReading.temperature!.toFixed(1)}°C — ${deviation.toFixed(1)}°C ${direction} target of ${config.target_temp}°C.`,
      threshold_value: DEFAULTS.TEMP_DEVIATION_C,
      actual_value: latestReading.temperature ?? null,
    }
  }

  return null
}

/**
 * pH out of range: latest pH reading is outside 4.0–5.5.
 */
function detectPhOutOfRange(readings: BatchReadingInput[]): DetectedAlert | null {
  const latestReading = readings
    .filter((r) => r.ph != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  if (!latestReading) return null

  const ph = latestReading.ph!

  if (ph < DEFAULTS.PH_MIN || ph > DEFAULTS.PH_MAX) {
    const direction = ph < DEFAULTS.PH_MIN ? 'below minimum' : 'above maximum'
    const limit = ph < DEFAULTS.PH_MIN ? DEFAULTS.PH_MIN : DEFAULTS.PH_MAX
    const deviation = Math.abs(ph - limit)
    const severity: FermentationAlertSeverity = deviation > 0.5 ? 'critical' : 'warning'

    return {
      alert_type: 'ph_out_of_range',
      severity,
      message: `pH reading of ${ph.toFixed(2)} is ${direction} (target range: ${DEFAULTS.PH_MIN}–${DEFAULTS.PH_MAX}).`,
      threshold_value: limit,
      actual_value: ph,
    }
  }

  return null
}

/**
 * DO spike: dissolved oxygen > 0.3 ppm post-pitch.
 */
function detectDoSpike(readings: BatchReadingInput[]): DetectedAlert | null {
  const latestReading = readings
    .filter((r) => r.dissolved_oxygen != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  if (!latestReading) return null

  const doValue = latestReading.dissolved_oxygen!

  if (doValue > DEFAULTS.DO_SPIKE_PPM) {
    const severity: FermentationAlertSeverity = doValue > DEFAULTS.DO_SPIKE_PPM * 2 ? 'critical' : 'warning'

    return {
      alert_type: 'do_spike',
      severity,
      message: `Dissolved oxygen spike detected: ${doValue.toFixed(2)} ppm (threshold: ${DEFAULTS.DO_SPIKE_PPM} ppm).`,
      threshold_value: DEFAULTS.DO_SPIKE_PPM,
      actual_value: doValue,
    }
  }

  return null
}

/**
 * Over-pressure: latest pressure reading > 15 PSI (configurable).
 */
function detectOverPressure(
  readings: BatchReadingInput[],
  config: BatchConfig
): DetectedAlert | null {
  const maxPsi = config.max_pressure_psi ?? DEFAULTS.OVER_PRESSURE_PSI

  const latestReading = readings
    .filter((r) => r.pressure != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  if (!latestReading) return null

  const psi = latestReading.pressure!

  if (psi > maxPsi) {
    const severity: FermentationAlertSeverity = psi > maxPsi * 1.5 ? 'critical' : 'warning'

    return {
      alert_type: 'over_pressure',
      severity,
      message: `Tank pressure of ${psi.toFixed(1)} PSI exceeds the ${maxPsi} PSI threshold.`,
      threshold_value: maxPsi,
      actual_value: psi,
    }
  }

  return null
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

/**
 * Run all fermentation anomaly detectors against a set of readings.
 * Pure function — no DB access.
 *
 * @param readings   Array of batch_readings rows (most recent first preferred)
 * @param config     Batch-level configuration (target temp, max PSI, etc.)
 * @returns          Array of alerts detected. Can be empty.
 */
export function detectFermentationAlerts(
  readings: BatchReadingInput[],
  config: BatchConfig = {}
): DetectedAlert[] {
  const alerts: DetectedAlert[] = []

  const checks = [
    detectStuckFermentation(readings),
    detectTemperatureDeviation(readings, config),
    detectPhOutOfRange(readings),
    detectDoSpike(readings),
    detectOverPressure(readings, config),
  ]

  for (const alert of checks) {
    if (alert !== null) alerts.push(alert)
  }

  return alerts
}
