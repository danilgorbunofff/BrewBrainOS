import { describe, expect, it } from 'vitest'
import { detectFermentationAlerts, BatchReadingInput, BatchConfig } from '../../src/lib/fermentation-alerts'

// ─── Helpers ────────────────────────────────────────────────────────
function makeReading(overrides: Partial<BatchReadingInput> & { hoursAgo?: number } = {}): BatchReadingInput {
  const { hoursAgo = 0, ...rest } = overrides
  return {
    id: `r-${Math.random().toString(36).slice(2, 8)}`,
    gravity: null,
    temperature: null,
    ph: null,
    dissolved_oxygen: null,
    pressure: null,
    created_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    ...rest,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('detectFermentationAlerts', () => {
  // ─── Empty / Minimal ─────────────────────────────────────────────
  it('returns empty for no readings', () => {
    expect(detectFermentationAlerts([])).toEqual([])
  })

  it('returns empty for single reading (not enough for trend)', () => {
    const readings = [makeReading({ gravity: 1.050 })]
    expect(detectFermentationAlerts(readings)).toEqual([])
  })

  it('handles all-null readings gracefully', () => {
    const readings = [makeReading({ hoursAgo: 0 }), makeReading({ hoursAgo: 24 })]
    expect(detectFermentationAlerts(readings)).toEqual([])
  })

  // ─── Stuck Fermentation ──────────────────────────────────────────
  describe('stuck fermentation', () => {
    it('detects stuck fermentation — flat gravity over 48h', () => {
      const readings = [
        makeReading({ gravity: 1.050, hoursAgo: 0 }),
        makeReading({ gravity: 1.050, hoursAgo: 12 }),
        makeReading({ gravity: 1.0505, hoursAgo: 24 }),
        makeReading({ gravity: 1.050, hoursAgo: 47 }),
      ]

      const alerts = detectFermentationAlerts(readings)
      const stuck = alerts.find((a) => a.alert_type === 'stuck_fermentation')

      expect(stuck).toBeDefined()
      expect(stuck!.severity).toBe('warning')
      expect(stuck!.threshold_value).toBe(0.001)
    })

    it('does not trigger when gravity is changing', () => {
      const readings = [
        makeReading({ gravity: 1.040, hoursAgo: 0 }),
        makeReading({ gravity: 1.050, hoursAgo: 24 }),
      ]

      const alerts = detectFermentationAlerts(readings)
      const stuck = alerts.find((a) => a.alert_type === 'stuck_fermentation')
      expect(stuck).toBeUndefined()
    })

    it('skips when readings are outside the 48h window', () => {
      const readings = [
        makeReading({ gravity: 1.050, hoursAgo: 0 }),
        makeReading({ gravity: 1.050, hoursAgo: 72 }), // 72h ago — outside window
      ]

      const alerts = detectFermentationAlerts(readings)
      const stuck = alerts.find((a) => a.alert_type === 'stuck_fermentation')
      expect(stuck).toBeUndefined() // Only 1 reading in window
    })
  })

  // ─── Temperature Deviation ───────────────────────────────────────
  describe('temperature deviation', () => {
    it('detects temperature deviation >2°C from target', () => {
      const config: BatchConfig = { target_temp: 20 }
      const readings = [makeReading({ temperature: 25, hoursAgo: 0 })]

      const alerts = detectFermentationAlerts(readings, config)
      const temp = alerts.find((a) => a.alert_type === 'temperature_deviation')

      expect(temp).toBeDefined()
      expect(temp!.severity).toBe('critical') // 5°C > 4°C critical threshold
      expect(temp!.actual_value).toBe(25)
    })

    it('returns warning for moderate deviation (2-4°C)', () => {
      const config: BatchConfig = { target_temp: 20 }
      const readings = [makeReading({ temperature: 23, hoursAgo: 0 })]

      const alerts = detectFermentationAlerts(readings, config)
      const temp = alerts.find((a) => a.alert_type === 'temperature_deviation')

      expect(temp).toBeDefined()
      expect(temp!.severity).toBe('warning')
    })

    it('skips temp check when target_temp is null', () => {
      const config: BatchConfig = { target_temp: null }
      const readings = [makeReading({ temperature: 30, hoursAgo: 0 })]

      const alerts = detectFermentationAlerts(readings, config)
      const temp = alerts.find((a) => a.alert_type === 'temperature_deviation')
      expect(temp).toBeUndefined()
    })

    it('skips when no temperature readings exist', () => {
      const config: BatchConfig = { target_temp: 20 }
      const readings = [makeReading({ gravity: 1.050 })] // no temperature

      const alerts = detectFermentationAlerts(readings, config)
      const temp = alerts.find((a) => a.alert_type === 'temperature_deviation')
      expect(temp).toBeUndefined()
    })

    it('does not trigger when within range', () => {
      const config: BatchConfig = { target_temp: 20 }
      const readings = [makeReading({ temperature: 21, hoursAgo: 0 })]

      const alerts = detectFermentationAlerts(readings, config)
      const temp = alerts.find((a) => a.alert_type === 'temperature_deviation')
      expect(temp).toBeUndefined()
    })
  })

  // ─── pH Out of Range ─────────────────────────────────────────────
  describe('pH out of range', () => {
    it('detects low pH (<4.0) — warning', () => {
      const readings = [makeReading({ ph: 3.8, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const ph = alerts.find((a) => a.alert_type === 'ph_out_of_range')

      expect(ph).toBeDefined()
      expect(ph!.severity).toBe('warning')
      expect(ph!.actual_value).toBe(3.8)
    })

    it('detects critically low pH (<3.5) — critical', () => {
      const readings = [makeReading({ ph: 3.2, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const ph = alerts.find((a) => a.alert_type === 'ph_out_of_range')

      expect(ph).toBeDefined()
      expect(ph!.severity).toBe('critical')
    })

    it('detects high pH (>5.5) — warning', () => {
      const readings = [makeReading({ ph: 5.8, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const ph = alerts.find((a) => a.alert_type === 'ph_out_of_range')

      expect(ph).toBeDefined()
      expect(ph!.severity).toBe('warning')
    })

    it('does not trigger when pH is within range', () => {
      const readings = [makeReading({ ph: 4.5, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const ph = alerts.find((a) => a.alert_type === 'ph_out_of_range')
      expect(ph).toBeUndefined()
    })

    it('skips when pH is null', () => {
      const readings = [makeReading({ gravity: 1.050 })]
      const alerts = detectFermentationAlerts(readings)
      const ph = alerts.find((a) => a.alert_type === 'ph_out_of_range')
      expect(ph).toBeUndefined()
    })
  })

  // ─── DO Spike ────────────────────────────────────────────────────
  describe('DO spike', () => {
    it('detects DO spike above 0.3 ppm — warning', () => {
      const readings = [makeReading({ dissolved_oxygen: 0.4, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const doAlert = alerts.find((a) => a.alert_type === 'do_spike')

      expect(doAlert).toBeDefined()
      expect(doAlert!.severity).toBe('warning')
    })

    it('detects critical DO spike (>0.6 ppm)', () => {
      const readings = [makeReading({ dissolved_oxygen: 0.8, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const doAlert = alerts.find((a) => a.alert_type === 'do_spike')

      expect(doAlert).toBeDefined()
      expect(doAlert!.severity).toBe('critical')
    })

    it('does not trigger when DO is within range', () => {
      const readings = [makeReading({ dissolved_oxygen: 0.1, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const doAlert = alerts.find((a) => a.alert_type === 'do_spike')
      expect(doAlert).toBeUndefined()
    })
  })

  // ─── Over Pressure ──────────────────────────────────────────────
  describe('over pressure', () => {
    it('detects pressure >15 PSI — warning', () => {
      const readings = [makeReading({ pressure: 18, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const pAlert = alerts.find((a) => a.alert_type === 'over_pressure')

      expect(pAlert).toBeDefined()
      expect(pAlert!.severity).toBe('warning')
      expect(pAlert!.actual_value).toBe(18)
    })

    it('detects critical over-pressure (>22.5 PSI = 1.5x threshold)', () => {
      const readings = [makeReading({ pressure: 25, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const pAlert = alerts.find((a) => a.alert_type === 'over_pressure')

      expect(pAlert).toBeDefined()
      expect(pAlert!.severity).toBe('critical')
    })

    it('respects custom max_pressure_psi from config', () => {
      const config: BatchConfig = { max_pressure_psi: 10 }
      const readings = [makeReading({ pressure: 12, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings, config)
      const pAlert = alerts.find((a) => a.alert_type === 'over_pressure')

      expect(pAlert).toBeDefined()
    })

    it('does not trigger when pressure is within range', () => {
      const readings = [makeReading({ pressure: 10, hoursAgo: 0 })]
      const alerts = detectFermentationAlerts(readings)
      const pAlert = alerts.find((a) => a.alert_type === 'over_pressure')
      expect(pAlert).toBeUndefined()
    })
  })

  // ─── Multiple Alerts ────────────────────────────────────────────
  it('detects multiple anomalies simultaneously', () => {
    const config: BatchConfig = { target_temp: 20 }
    const readings = [
      makeReading({ temperature: 30, ph: 3.0, dissolved_oxygen: 1.0, pressure: 25, hoursAgo: 0 }),
    ]

    const alerts = detectFermentationAlerts(readings, config)

    expect(alerts.length).toBeGreaterThanOrEqual(4)
    expect(alerts.map((a) => a.alert_type)).toEqual(
      expect.arrayContaining(['temperature_deviation', 'ph_out_of_range', 'do_spike', 'over_pressure']),
    )
  })

  // ─── Mixed null/valid readings ──────────────────────────────────
  it('handles mixed null/valid readings across sensors', () => {
    const config: BatchConfig = { target_temp: 20 }
    const readings = [
      makeReading({ temperature: null, ph: 3.8, hoursAgo: 0 }),
      makeReading({ temperature: 25, ph: null, hoursAgo: 12 }),
    ]

    const alerts = detectFermentationAlerts(readings, config)

    // Should detect temperature deviation from second reading + pH from first
    const types = alerts.map((a) => a.alert_type)
    expect(types).toContain('temperature_deviation')
    expect(types).toContain('ph_out_of_range')
  })
})
