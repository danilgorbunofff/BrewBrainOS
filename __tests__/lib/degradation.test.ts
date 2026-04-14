/**
 * BrewBrain OS — Degradation Metrics Testing Suite
 * Unit Tests + Integration Tests for ingredient freshness tracking
 * 
 * Run tests: npm test -- degradation.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  calculateHSI,
  calculateGrainMoisture,
  calculatePPG,
  getDegradationHealthStatus,
  generateDegradationAlerts,
  recalculateDegradationMetrics,
  formatDegradationChangeReason,
} from '@/lib/degradation'

describe('Degradation Metrics - HSI Calculation', () => {
  it('should return 100 for fresh hops (0 days stored)', () => {
    const today = new Date().toISOString().split('T')[0]
    const hsi = calculateHSI(100, today, 'cool_dry')
    expect(hsi).toBe(100)
  })

  it('should degrade hops at ~0.15% per month in cool_dry storage', () => {
    const received = new Date()
    received.setDate(received.getDate() - 30)  // 30 days ago
    const hsi = calculateHSI(100, received.toISOString().split('T')[0], 'cool_dry')
    expect(hsi).toBeCloseTo(99.85, 1)  // ~0.15% loss over 30 days
  })

  it('should degrade faster in warm storage (2.5x multiplier)', () => {
    const received = new Date()
    received.setDate(received.getDate() - 30)
    const coolHSI = calculateHSI(100, received.toISOString().split('T')[0], 'cool_dry')
    const warmHSI = calculateHSI(100, received.toISOString().split('T')[0], 'warm')
    const coolLoss = 100 - coolHSI
    const warmLoss = 100 - warmHSI

    expect(warmHSI).toBeLessThan(coolHSI)
    expect(warmLoss / coolLoss).toBeCloseTo(2.5, 0)
  })

  it('should never go below 0', () => {
    const received = new Date()
    received.setDate(received.getDate() - 3650)  // 10 years
    const hsi = calculateHSI(100, received.toISOString().split('T')[0], 'warm')
    expect(hsi).toBeGreaterThanOrEqual(0)
  })

  it('should handle initial HSI values correctly', () => {
    const today = new Date().toISOString().split('T')[0]
    const hsi = calculateHSI(85, today, 'cool_dry')  // 85% initial freshness
    expect(hsi).toBe(85)
  })
})

describe('Degradation Metrics - Grain Moisture Calculation', () => {
  it('should maintain moisture in cool_dry storage', () => {
    const today = new Date().toISOString().split('T')[0]
    const moisture = calculateGrainMoisture(10, today, 'cool_dry')
    expect(moisture).toBeCloseTo(10, 0)
  })

  it('should absorb moisture in humid storage', () => {
    const received = new Date()
    received.setDate(received.getDate() - 30)
    const moisture = calculateGrainMoisture(10, received.toISOString().split('T')[0], 'cool_humid')
    expect(moisture).toBeGreaterThan(10)  // Should increase
  })

  it('should lose moisture in cool_dry storage', () => {
    const received = new Date()
    received.setDate(received.getDate() - 30)
    const moisture = calculateGrainMoisture(10, received.toISOString().split('T')[0], 'cool_dry')
    expect(moisture).toBeLessThan(10)  // Should decrease
  })

  it('should use manually measured moisture if provided', () => {
    const today = new Date().toISOString().split('T')[0]
    const moisture = calculateGrainMoisture(10, today, 'cool_dry', 15)
    expect(moisture).toBe(15)  // Use manual override
  })

  it('should clamp moisture between 0-30%', () => {
    const today = new Date().toISOString().split('T')[0]
    const tooHigh = calculateGrainMoisture(10, today, 'warm', 50)
    const tooLow = calculateGrainMoisture(10, today, 'cool_dry', -5)
    expect(tooHigh).toBeLessThanOrEqual(30)
    expect(tooLow).toBeGreaterThanOrEqual(0)
  })
})

describe('Degradation Metrics - PPG Calculation', () => {
  it('should preserve PPG with no HSI or moisture loss', () => {
    const ppg = calculatePPG(37, 0, 0)
    expect(ppg).toBeCloseTo(37, 0)
  })

  it('should reduce PPG with HSI loss', () => {
    const ppg = calculatePPG(37, 10, 0)  // 10% HSI loss
    expect(ppg).toBeLessThan(37)
    expect(ppg).toBeGreaterThan(36.9)  // Small impact
  })

  it('should significantly reduce PPG with grain over-drying', () => {
    const ppg = calculatePPG(37, 0, -3)  // 3% under optimal moisture
    expect(ppg).toBeLessThan(37)
  })

  it('should severely reduce PPG with over-moisture', () => {
    const ppg = calculatePPG(37, 0, 4)  // 4% above optimal
    expect(ppg).toBeLessThan(37)
  })

  it('should never drop below 10% of initial PPG', () => {
    const ppg = calculatePPG(37, 100, 20)  // Extreme degradation
    expect(ppg).toBeGreaterThanOrEqual(37 * 0.1)
  })
})

describe('Degradation Metrics - Health Status', () => {
  it('should return fresh for excellent metrics', () => {
    const status = getDegradationHealthStatus(95, 10, 2)
    expect(status).toBe('fresh')
  })

  it('should return degraded for moderate issues', () => {
    const status = getDegradationHealthStatus(70, 13, 12)
    expect(status).toBe('degraded')
  })

  it('should return critical for severe issues', () => {
    const status = getDegradationHealthStatus(25, 16, 30)
    expect(status).toBe('critical')
  })

  it('should handle null values gracefully', () => {
    const status = getDegradationHealthStatus(null, 10, 5)
    expect(['fresh', 'degraded', 'critical']).toContain(status)
  })
})

describe('Degradation Metrics - Alerts', () => {
  it('should alert for critically low HSI', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Hops',
      hsi_current: 25,
    })
    expect(alerts.some(a => a.level === 'critical' && a.message.includes('critically'))).toBe(true)
  })

  it('should alert for moderate HSI decline', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Hops',
      hsi_current: 60,
    })
    expect(alerts.some(a => a.level === 'warning')).toBe(true)
  })

  it('should alert for high grain moisture (mold risk)', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Grain',
      grain_moisture_current: 16,
    })
    expect(alerts.some(a => a.message.includes('mold'))).toBe(true)
  })

  it('should alert for too-dry grain', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Grain',
      grain_moisture_current: 5,
    })
    expect(alerts.some(a => a.message.includes('brittle'))).toBe(true)
  })

  it('should alert for significant PPG loss', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Grain',
      ppg_initial: 37,
      ppg_current: 30,
    })
    expect(alerts.some(a => a.message.includes('PPG'))).toBe(true)
  })

  it('should emit no alerts for healthy ingredients', () => {
    const alerts = generateDegradationAlerts({
      item_type: 'Hops',
      hsi_current: 92,
      grain_moisture_current: 10,
      ppg_initial: 37,
      ppg_current: 36.8,
    })
    expect(alerts.length).toBe(0)
  })
})

describe('Degradation Metrics - Full Recalculation', () => {
  it('should recalculate all metrics for a degrading item', () => {
    const received = new Date()
    received.setDate(received.getDate() - 60)  // 60 days old

    const item = {
      hsi_initial: 100,
      hsi_current: 100,
      grain_moisture_initial: 10,
      grain_moisture_current: 10,
      ppg_initial: 37,
      ppg_current: 37,
      received_date: received.toISOString().split('T')[0],
      storage_condition: 'cool_dry' as const,
    }

    const result = recalculateDegradationMetrics(item)

    expect(result.hsi_current).toBeLessThan(100)
    expect(result.grain_moisture_current).toBeLessThan(10)
    expect(result.ppg_current).toBeLessThan(37)
    expect(result.hsi_loss_pct).toBeGreaterThan(0)
  })

  it('should handle items without certain metrics', () => {
    const received = new Date().toISOString().split('T')[0]

    const item = {
      hsi_initial: 100,
      hsi_current: 100,
      grain_moisture_initial: null,
      grain_moisture_current: null,
      ppg_initial: null,
      ppg_current: null,
      received_date: received,
      storage_condition: 'cool_dry' as const,
    }

    const result = recalculateDegradationMetrics(item)

    expect(result.hsi_current).toBeDefined()
    expect(result.grain_moisture_current).toBeNull()
    expect(result.ppg_current).toBeNull()
  })
})

describe('Degradation Metrics - Integration', () => {
  it('full flow: fresh hops → degraded after prolonged warm storage', () => {
    const freshDate = new Date()
    freshDate.setFullYear(freshDate.getFullYear() - 6)

    const hsi = calculateHSI(100, freshDate.toISOString().split('T')[0], 'warm')
    const alerts = generateDegradationAlerts({ item_type: 'Hops', hsi_current: hsi })
    const status = getDegradationHealthStatus(hsi, null, 0)

    expect(hsi).toBeLessThan(75)
    expect(alerts.length).toBeGreaterThan(0)
    expect(status).toBe('degraded')
  })

  it('full flow: grain maintaining quality in ideal conditions', () => {
    const received = new Date().toISOString().split('T')[0]

    const moisture = calculateGrainMoisture(10, received, 'cool_dry')
    const ppg = calculatePPG(37, 0, 0)
    const alerts = generateDegradationAlerts({
      item_type: 'Grain',
      grain_moisture_current: moisture,
      ppg_initial: 37,
      ppg_current: ppg,
    })
    const status = getDegradationHealthStatus(null, moisture, 0)

    expect(moisture).toBeCloseTo(10, 0)
    expect(ppg).toBeCloseTo(37, 0)
    expect(alerts.length).toBe(0)
    expect(status).toBe('fresh')
  })
})

// Performance benchmarks
describe('Degradation Metrics - Performance', () => {
  it('should calculate HSI for 1000 items in <100ms', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      const received = new Date()
      received.setDate(received.getDate() - Math.random() * 365)
      calculateHSI(100, received.toISOString().split('T')[0], 'cool_dry')
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })

  it('should recalculate metrics for 1000 items in <200ms', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      const received = new Date()
      received.setDate(received.getDate() - Math.random() * 365)
      recalculateDegradationMetrics({
        hsi_initial: 100,
        hsi_current: 100,
        grain_moisture_initial: 10,
        grain_moisture_current: 10,
        ppg_initial: 37,
        ppg_current: 37,
        received_date: received.toISOString().split('T')[0],
        storage_condition: 'cool_dry',
      })
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(200)
  })
})

describe('Degradation Metrics - Change Reason Labels', () => {
  it('formats auto_calc as "Auto-calculated"', () => {
    expect(formatDegradationChangeReason('auto_calc')).toBe('Auto-calculated')
  })

  it('formats manual_input as "Manual input"', () => {
    expect(formatDegradationChangeReason('manual_input')).toBe('Manual input')
  })

  it('formats storage_change as "Storage change"', () => {
    expect(formatDegradationChangeReason('storage_change')).toBe('Storage change')
  })

  it('formats quality_test as "Quality test"', () => {
    expect(formatDegradationChangeReason('quality_test')).toBe('Quality test')
  })
})
