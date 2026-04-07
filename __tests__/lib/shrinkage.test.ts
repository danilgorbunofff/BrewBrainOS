import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateShrinkageBaseline,
  detectShrinkageAnomaly,
  detectUnusualSingleLoss,
  shouldMonitorForShrinkage,
} from '@/lib/shrinkage'
import type { InventoryHistory } from '@/types/database'

function buildHistoryEntry(
  id: string,
  quantityChange: number,
  daysAgo: number,
  currentStock: number
): InventoryHistory {
  return {
    id,
    inventory_id: 'inventory-1',
    brewery_id: 'brewery-1',
    previous_stock: currentStock - quantityChange,
    current_stock: currentStock,
    quantity_change: quantityChange,
    change_type: quantityChange < 0 ? 'waste' : 'received',
    reason: null,
    batch_id: null,
    recorded_by: 'tester',
    provenance_ip: null,
    provenance_user_agent: null,
    created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  }
}

describe('shrinkage utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates a positive monthly loss baseline from recent negative history entries', () => {
    const history: InventoryHistory[] = [
      buildHistoryEntry('loss-1', -12, 10, 88),
      buildHistoryEntry('loss-2', -9, 20, 79),
      buildHistoryEntry('gain-1', 6, 25, 85),
      buildHistoryEntry('loss-3', -15, 45, 70),
      buildHistoryEntry('loss-4', -8, 70, 62),
      buildHistoryEntry('old-loss', -20, 120, 42),
    ]

    expect(calculateShrinkageBaseline(history, 90)).toEqual({
      average_monthly_loss: expect.any(Number),
      monthly_loss_std_dev: expect.any(Number),
      median_loss_percentage: 10.5,
      sample_count: 4,
    })

    const baseline = calculateShrinkageBaseline(history, 90)
    expect(baseline.average_monthly_loss).toBeGreaterThan(0)
    expect(baseline.sample_count).toBe(4)
  })

  it('returns zeroed baseline metrics for empty or non-loss history', () => {
    expect(calculateShrinkageBaseline([], 90)).toEqual({
      average_monthly_loss: 0,
      monthly_loss_std_dev: 0,
      median_loss_percentage: 0,
      sample_count: 0,
    })

    expect(
      calculateShrinkageBaseline(
        [
          buildHistoryEntry('gain-1', 10, 5, 110),
          buildHistoryEntry('gain-2', 8, 12, 118),
        ],
        90
      )
    ).toEqual({
      average_monthly_loss: 0,
      monthly_loss_std_dev: 0,
      median_loss_percentage: 0,
      sample_count: 0,
    })
  })

  it('flags a large single loss as an anomaly with non-zero confidence', () => {
    const history: InventoryHistory[] = [
      buildHistoryEntry('loss-latest', -40, 1, 60),
      buildHistoryEntry('loss-2', -5, 5, 95),
      buildHistoryEntry('loss-3', -4, 9, 91),
      buildHistoryEntry('loss-4', -6, 12, 85),
      buildHistoryEntry('loss-5', -5, 18, 80),
      buildHistoryEntry('loss-6', -4, 24, 76),
      buildHistoryEntry('loss-7', -5, 30, 71),
      buildHistoryEntry('loss-8', -6, 36, 65),
      buildHistoryEntry('loss-9', -5, 42, 60),
      buildHistoryEntry('loss-10', -4, 48, 56),
    ]

    const anomaly = detectUnusualSingleLoss(history, 60, 100, {
      mean_loss: 6,
      std_dev: 1,
    })

    expect(anomaly).not.toBeNull()
    expect(anomaly).toMatchObject({
      is_anomaly: true,
      alert_type: 'unusual_single_loss',
      severity: 'critical',
    })
    expect(anomaly?.confidence).toBeGreaterThan(0)
  })

  it('returns no alert when there is no actual loss or the loss is below threshold', () => {
    const history = [buildHistoryEntry('loss-1', -5, 2, 95)]

    expect(
      detectShrinkageAnomaly('inventory-1', 'Malt', 100, 100, history, {
        average_monthly_loss: 5,
        monthly_loss_std_dev: 1,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      })
    ).toBeNull()

    expect(
      detectShrinkageAnomaly('inventory-1', 'Malt', 100, 96, history, {
        average_monthly_loss: 5,
        monthly_loss_std_dev: 1,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      })
    ).toBeNull()
  })

  it('falls back to variance threshold exceeded when no specific anomaly pattern matches', () => {
    const alert = detectShrinkageAnomaly(
      'inventory-1',
      'Malt',
      100,
      90,
      [
        buildHistoryEntry('loss-1', -5, 2, 95),
        buildHistoryEntry('loss-2', -5, 10, 90),
      ],
      {
        average_monthly_loss: 5,
        monthly_loss_std_dev: 2,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      }
    )

    expect(alert).toMatchObject({
      alert_type: 'variance_threshold_exceeded',
      severity: 'medium',
      loss_amount: 10,
      loss_percentage: 10,
      average_monthly_loss: 5,
      confidence_score: 50,
      status: 'unresolved',
    })
  })

  it('detects a consistent recent degradation pattern', () => {
    const alert = detectShrinkageAnomaly(
      'inventory-1',
      'Bright Tank',
      100,
      88,
      [
        buildHistoryEntry('loss-1', -5, 2, 95),
        buildHistoryEntry('loss-2', -5, 6, 90),
        buildHistoryEntry('loss-3', -5, 10, 85),
        buildHistoryEntry('loss-4', -5, 14, 80),
        buildHistoryEntry('loss-5', -5, 18, 75),
      ],
      {
        average_monthly_loss: 5,
        monthly_loss_std_dev: 1,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      }
    )

    expect(alert).toMatchObject({
      alert_type: 'pattern_degradation',
      severity: 'medium',
      confidence_score: 100,
    })
  })

  it('detects a sudden spike against the historical baseline', () => {
    const alert = detectShrinkageAnomaly(
      'inventory-1',
      'Hops',
      100,
      80,
      [
        buildHistoryEntry('loss-latest', -20, 1, 80),
        buildHistoryEntry('loss-2', -5, 6, 95),
        buildHistoryEntry('loss-3', -5, 12, 90),
        buildHistoryEntry('loss-4', -5, 18, 85),
      ],
      {
        average_monthly_loss: 5,
        monthly_loss_std_dev: 1,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      }
    )

    expect(alert).toMatchObject({
      alert_type: 'sudden_spike',
      severity: 'high',
      confidence_score: 75,
    })
  })

  it('detects high variance in stock changes when volatility dominates the pattern', () => {
    const alert = detectShrinkageAnomaly(
      'inventory-1',
      'Yeast',
      100,
      80,
      [
        buildHistoryEntry('loss-latest', -30, 1, 70),
        buildHistoryEntry('gain-1', 40, 4, 110),
        buildHistoryEntry('loss-2', -5, 8, 105),
        buildHistoryEntry('gain-2', 30, 12, 135),
        buildHistoryEntry('loss-3', -20, 16, 115),
      ],
      {
        average_monthly_loss: 30,
        monthly_loss_std_dev: 20,
        loss_threshold_warning: 5,
        loss_threshold_critical: 10,
      }
    )

    expect(alert).toMatchObject({
      alert_type: 'high_variance',
      severity: 'medium',
      confidence_score: 60,
    })
  })

  it('always monitors inventory items for shrinkage alerts', () => {
    expect(shouldMonitorForShrinkage('Hops', 100, 12)).toBe(true)
  })
})