import { describe, it, expect } from 'vitest'
import { buildGravityTrend } from '@/lib/gravity-trend'

function r(gravity: number | null, created_at: string) {
  return { gravity, created_at }
}

describe('buildGravityTrend', () => {
  it('returns an empty result when no readings are present', () => {
    const result = buildGravityTrend([])
    expect(result.values).toHaveLength(0)
    expect(result.heights).toHaveLength(0)
    expect(result.currentDisplay).toBeNull()
  })

  it('returns an empty result when only one valid reading exists', () => {
    const result = buildGravityTrend([r(1.048, '2026-04-01T10:00:00Z')])
    expect(result.values).toHaveLength(0)
  })

  it('filters out null gravity readings', () => {
    const result = buildGravityTrend([
      r(null, '2026-04-01T10:00:00Z'),
      r(1.060, '2026-04-02T10:00:00Z'),
      r(null, '2026-04-03T10:00:00Z'),
    ])
    expect(result.values).toHaveLength(0)
  })

  it('converts SG floats to milli-SG integers', () => {
    const result = buildGravityTrend([
      r(1.065, '2026-04-01T10:00:00Z'),
      r(1.020, '2026-04-08T10:00:00Z'),
    ])
    expect(result.values).toEqual([65, 20])
  })

  it('sorts readings into chronological order regardless of input order', () => {
    const result = buildGravityTrend([
      r(1.020, '2026-04-08T10:00:00Z'),
      r(1.065, '2026-04-01T10:00:00Z'),
      r(1.040, '2026-04-04T10:00:00Z'),
    ])
    expect(result.values).toEqual([65, 40, 20])
  })

  it('returns the latest gravity as currentDisplay in "1.xxx" format', () => {
    const result = buildGravityTrend([
      r(1.065, '2026-04-01T10:00:00Z'),
      r(1.012, '2026-04-08T10:00:00Z'),
    ])
    expect(result.currentDisplay).toBe('1.012')
  })

  it('normalises heights to a 0–100 range with minimum bar height enforced', () => {
    const result = buildGravityTrend([
      r(1.065, '2026-04-01T10:00:00Z'), // highest gravity → tallest bar
      r(1.040, '2026-04-04T10:00:00Z'),
      r(1.012, '2026-04-08T10:00:00Z'), // lowest gravity → shortest bar
    ])

    expect(result.heights).toHaveLength(3)
    // All heights must be within [minBarPct, 100]
    for (const h of result.heights) {
      expect(h).toBeGreaterThanOrEqual(result.minBarPct)
      expect(h).toBeLessThanOrEqual(100)
    }
    // Tallest bar = highest gravity
    expect(result.heights[0]).toBeGreaterThan(result.heights[1])
    expect(result.heights[1]).toBeGreaterThan(result.heights[2])
  })

  it('handles a flat gravity series without producing NaN or zero-height bars', () => {
    const result = buildGravityTrend([
      r(1.020, '2026-04-01T10:00:00Z'),
      r(1.020, '2026-04-04T10:00:00Z'),
      r(1.020, '2026-04-08T10:00:00Z'),
    ])
    expect(result.values).toEqual([20, 20, 20])
    for (const h of result.heights) {
      expect(h).toBeGreaterThan(0)
      expect(Number.isNaN(h)).toBe(false)
    }
  })

  it('includes readings with null gravity if mixed with valid ones', () => {
    // Only the two valid readings should be used, nulls are dropped.
    const result = buildGravityTrend([
      r(null, '2026-04-01T10:00:00Z'),
      r(1.065, '2026-04-02T10:00:00Z'),
      r(null, '2026-04-05T10:00:00Z'),
      r(1.012, '2026-04-08T10:00:00Z'),
    ])
    expect(result.values).toEqual([65, 12])
    expect(result.currentDisplay).toBe('1.012')
  })

  it('returns a result with up to 14 values for a 14-reading series', () => {
    const readings = Array.from({ length: 14 }, (_, i) => ({
      gravity: 1.065 - i * 0.004,
      created_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    }))
    const result = buildGravityTrend(readings)
    expect(result.values).toHaveLength(14)
    expect(result.heights).toHaveLength(14)
  })
})
