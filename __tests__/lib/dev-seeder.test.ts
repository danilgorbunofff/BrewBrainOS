import { describe, expect, it } from 'vitest'

import { generateScenario } from '../../src/lib/dev-seeder'

describe('generateScenario', () => {
  it('is deterministic for the same seed and options', () => {
    const first = generateScenario('overdrive-seed-01', {
      template: 'criticalAlerts',
      size: 'medium',
      density: 'balanced',
    })

    const second = generateScenario('overdrive-seed-01', {
      template: 'criticalAlerts',
      size: 'medium',
      density: 'balanced',
    })

    expect(second).toEqual(first)
  })

  it('creates stable cross references and summary counts', () => {
    const scenario = generateScenario('overdrive-seed-02', {
      template: 'criticalAlerts',
      size: 'small',
      density: 'dense',
    })

    const batchKeys = new Set(scenario.batches.map((batch) => batch.key))

    expect(scenario.summary).toEqual({
      tanks: scenario.tanks.length,
      batches: scenario.batches.length,
      readings: scenario.readings.length,
      inventory: scenario.inventory.length,
      alerts: scenario.alerts.length,
    })

    expect(scenario.seed).toBe('overdrive-seed-02')
    expect(scenario.alerts.length).toBeGreaterThan(0)
    expect(scenario.readings.length).toBeGreaterThan(0)

    for (const reading of scenario.readings) {
      expect(batchKeys.has(reading.batchKey)).toBe(true)
    }

    for (const alert of scenario.alerts) {
      expect(batchKeys.has(alert.batchKey)).toBe(true)
      expect(alert.insert.status).toBe('active')
    }
  })

  it('generates a non-empty seed when none is provided', () => {
    const scenario = generateScenario(undefined, {
      template: 'stockedVessels',
      size: 'small',
      density: 'balanced',
    })

    expect(scenario.seed.length).toBeGreaterThan(8)
    expect(scenario.template).toBe('stockedVessels')
  })
})