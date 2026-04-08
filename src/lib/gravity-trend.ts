/** Raw row from batch_readings as returned by the gravity trend query. */
export interface GravityReading {
  gravity: number | null
  created_at: string
}

/** Chart-ready output for the gravity sparkline. */
export interface GravityTrendResult {
  /** Gravity values in milli-SG units (e.g., 1.065 → 65), in chronological order. */
  values: number[]
  /**
   * Per-bar heights as percentages (0–100), normalized against the observed
   * min/max range so the chart fills its container sensibly regardless of how
   * narrow the gravity drop is.
   */
  heights: number[]
  /** Minimum visible bar height in percentage points to keep bars legible. */
  minBarPct: number
  /** Current (latest) gravity as a display string, e.g. "1.012". */
  currentDisplay: string | null
}

const MIN_BAR_PCT = 8

/**
 * Build display data for the dashboard gravity sparkline from a list of
 * batch readings.
 *
 * - Filters out rows with a null gravity.
 * - Sorts by `created_at` ascending (chronological order).
 * - Converts SG floats (e.g., 1.065) to milli-SG integers (e.g., 65).
 * - Normalises bar heights to 0–100 using the observed min/max so the chart
 *   fills its container regardless of how small the gravity drop is.
 * - Enforces a minimum bar height so no bar disappears entirely.
 *
 * Returns an empty result when fewer than 2 valid readings are present so
 * the caller can fall back to placeholder bars.
 */
export function buildGravityTrend(readings: GravityReading[]): GravityTrendResult {
  const valid = readings
    .filter((r): r is GravityReading & { gravity: number } => r.gravity != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (valid.length < 2) {
    return { values: [], heights: [], minBarPct: MIN_BAR_PCT, currentDisplay: null }
  }

  const values = valid.map(r => Math.round((r.gravity - 1) * 1000))

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min

  const heights: number[] = range === 0
    // Flat fermentation — render all bars at ~60% so something is visible.
    ? values.map(() => 60)
    : values.map(v => {
        const normalized = ((v - min) / range) * (100 - MIN_BAR_PCT)
        return Math.round(normalized + MIN_BAR_PCT)
      })

  const latestValue = valid[valid.length - 1].gravity
  const currentDisplay = latestValue.toFixed(3)

  return { values, heights, minBarPct: MIN_BAR_PCT, currentDisplay }
}
