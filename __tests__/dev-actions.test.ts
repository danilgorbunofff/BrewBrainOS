// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock Supabase ──────────────────────────────────────────────────────
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockRequireActiveBrewery = vi.fn()
const mockGenerateScenario = vi.fn()

function createChain(terminal?: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    update: mockUpdate,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: vi.fn(),
  }
  // Each method returns the chain for chaining
  for (const fn of Object.values(chain)) {
    fn.mockReturnValue(chain)
  }
  // Terminal calls return a data shape
  if (terminal !== undefined) {
    mockSingle.mockResolvedValue({ data: terminal, error: null })
    mockSelect.mockReturnValue({ ...chain, data: [], error: null })
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('@/lib/dev-seeder', () => ({
  generateScenario: mockGenerateScenario,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/fermentation-alerts', () => ({
  detectFermentationAlerts: vi.fn(() => []),
}))

// ─── Import after mocks ────────────────────────────────────────────────
const {
  simulateIotReading,
  simulateIotBurst,
  triggerFermentationAlertCron,
  seedRandomScenario,
  seedLargeDataset,
  seedDegradationScenario,
  seedFermentationAlerts,
} = await import('@/app/(app)/dev/actions.server')

describe('dev/actions.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    mockRequireActiveBrewery.mockResolvedValue({
      supabase: { from: mockFrom },
      brewery: { id: 'brewery-1' },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('simulateIotReading', () => {
    it('returns error when no fermenting batch is found', async () => {
      createChain()
      mockSingle.mockResolvedValue({ data: null, error: null })

      const result = await simulateIotReading('brewery-1', { temperature: 20 })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/No fermenting batch found/)
    })

    it('inserts a reading for a given batchId', async () => {
      const c = createChain()
      mockInsert.mockReturnValue({ error: null })
      // Mock alert detection chain (readings + batchConfig lookups)
      mockSingle.mockResolvedValue({ data: { target_temp: 20, brewery_id: 'brewery-1' }, error: null })
      mockSelect.mockReturnValue({
        ...c,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        data: [],
        error: null,
      })

      await simulateIotReading('brewery-1', {
        batchId: 'batch-1',
        temperature: 21.5,
        gravity: '1.048',
      })

      expect(mockFrom).toHaveBeenCalledWith('batch_readings')
      expect(mockInsert).toHaveBeenCalled()
      // The insert call should contain the temperature
      const insertArg = mockInsert.mock.calls[0]?.[0]
      expect(insertArg).toMatchObject({
        batch_id: 'batch-1',
        temperature: 21.5,
        gravity: '1.048',
      })
    })
  })

  describe('simulateIotBurst', () => {
    it('returns error when no fermenting batch exists', async () => {
      createChain()
      mockSingle.mockResolvedValue({ data: null, error: null })

      const result = await simulateIotBurst('brewery-1', 5)
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/No fermenting batch found/)
    })

    it('inserts multiple readings for a batch', async () => {
      createChain()
      mockSingle.mockResolvedValue({ data: { id: 'batch-1' }, error: null })
      mockInsert.mockReturnValue({ error: null })

      const result = await simulateIotBurst('brewery-1', 5, 10)
      expect(result.success).toBe(true)
      expect(result.message).toContain('5 readings')
      expect(mockInsert).toHaveBeenCalled()
      const insertArg = mockInsert.mock.calls[0]?.[0]
      expect(insertArg).toHaveLength(5)
    })
  })

  describe('triggerFermentationAlertCron', () => {
    it('returns error when no active batches exist', async () => {
      createChain()
      mockIn.mockReturnValue({ data: [], error: null })

      const result = await triggerFermentationAlertCron('brewery-1')
      expect(result.success).toBe(false)
    })
  })

  describe('seedLargeDataset', () => {
    it('seeds tanks, batches with readings, and inventory', async () => {
      const batchIds = Array.from({ length: 5 }, (_, i) => ({ id: `batch-${i}` }))
      createChain()
      // insert().select('id') chain for batches
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({ data: batchIds, error: null }),
        error: null,
      })

      const result = await seedLargeDataset('brewery-1', { batches: 5, readingsPerBatch: 2, tanks: 2, inventory: 3 })
      expect(result.success).toBe(true)
      expect(result.message).toContain('5 batches')
    })
  })

  describe('seedRandomScenario', () => {
    it('inserts generated tanks, batches, readings, inventory, and alerts', async () => {
      createChain()
      mockGenerateScenario.mockReturnValue({
        seed: 'fixture-seed',
        template: 'criticalAlerts',
        summary: {
          tanks: 1,
          batches: 1,
          readings: 2,
          inventory: 1,
          alerts: 1,
        },
        tanks: [
          {
            key: 'tank-01',
            batchKey: 'batch-01',
            insert: { name: 'FV-FIX-01', status: 'fermenting', capacity: 10, created_at: '2026-04-08T10:00:00.000Z' },
          },
        ],
        batches: [
          {
            key: 'batch-01',
            tankKey: 'tank-01',
            insert: {
              recipe_name: 'Fixture IPA #OD-FIX-01',
              status: 'fermenting',
              og: '1.060',
              fg: null,
              target_temp: 19.5,
              created_at: '2026-04-08T09:00:00.000Z',
            },
          },
        ],
        readings: [
          {
            batchKey: 'batch-01',
            insert: {
              temperature: 19.8,
              gravity: '1.048',
              ph: 4.2,
              dissolved_oxygen: 0.04,
              pressure: 8.4,
              notes: 'Fixture reading 1',
              provenance_ip: '127.0.0.1',
              provenance_user_agent: 'OverdriveSeeder/1.0',
              created_at: '2026-04-08T11:00:00.000Z',
            },
          },
          {
            batchKey: 'batch-01',
            insert: {
              temperature: 20.1,
              gravity: '1.040',
              ph: 4.1,
              dissolved_oxygen: 0.03,
              pressure: 8.8,
              notes: 'Fixture reading 2',
              provenance_ip: '127.0.0.1',
              provenance_user_agent: 'OverdriveSeeder/1.0',
              created_at: '2026-04-08T12:00:00.000Z',
            },
          },
        ],
        inventory: [
          {
            key: 'inventory-01',
            insert: {
              item_type: 'Grain',
              name: 'Pilsner Malt #OD-FIX-01',
              current_stock: 500,
              unit: 'kg',
              reorder_point: 120,
              purchase_price: 1.65,
              lot_number: 'LOT-FIX-001',
              manufacturer: 'Rahr',
              received_date: '2026-04-01',
              last_degradation_calc: '2026-04-08',
              degradation_tracked: true,
              storage_condition: 'cool_dry',
              hsi_initial: null,
              hsi_current: null,
              hsi_loss_rate: null,
              grain_moisture_initial: 4,
              grain_moisture_current: 4.5,
              ppg_initial: 37,
              ppg_current: 36,
              expiration_date: null,
            },
          },
        ],
        alerts: [
          {
            batchKey: 'batch-01',
            insert: {
              alert_type: 'temperature_deviation',
              severity: 'critical',
              message: 'Fixture alert',
              threshold_value: 22,
              actual_value: 27.5,
              status: 'active',
            },
          },
        ],
      })

      mockInsert
        .mockImplementationOnce(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'tank-db-1', name: 'FV-FIX-01' }], error: null }),
        }))
        .mockImplementationOnce(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'batch-db-1', recipe_name: 'Fixture IPA #OD-FIX-01' }], error: null }),
        }))
        .mockReturnValue({ error: null })

      const result = await seedRandomScenario('brewery-1', {
        seed: 'fixture-seed',
        template: 'criticalAlerts',
        opts: { size: 'small', density: 'balanced' },
      })

      expect(result.success).toBe(true)
      expect(result.seed).toBe('fixture-seed')
      expect(mockGenerateScenario).toHaveBeenCalledWith('fixture-seed', {
        template: 'criticalAlerts',
        size: 'small',
        density: 'balanced',
      })
      expect(mockFrom).toHaveBeenCalledWith('tanks')
      expect(mockFrom).toHaveBeenCalledWith('batches')
      expect(mockFrom).toHaveBeenCalledWith('batch_readings')
      expect(mockFrom).toHaveBeenCalledWith('inventory')
      expect(mockFrom).toHaveBeenCalledWith('fermentation_alerts')
      expect(mockUpdate).toHaveBeenCalledWith({ current_batch_id: 'batch-db-1', status: 'fermenting' })

      const readingInsert = mockInsert.mock.calls[2]?.[0]
      const inventoryInsert = mockInsert.mock.calls[3]?.[0]
      const alertInsert = mockInsert.mock.calls[4]?.[0]

      expect(readingInsert).toHaveLength(2)
      expect(readingInsert[0]).toMatchObject({ batch_id: 'batch-db-1', gravity: '1.048' })
      expect(inventoryInsert[0]).toMatchObject({ brewery_id: 'brewery-1', name: 'Pilsner Malt #OD-FIX-01' })
      expect(alertInsert[0]).toMatchObject({ batch_id: 'batch-db-1', brewery_id: 'brewery-1', alert_type: 'temperature_deviation' })
    })
  })

  describe('seedDegradationScenario', () => {
    it('inserts items with degradation tracking fields', async () => {
      createChain()
      mockInsert.mockReturnValue({ error: null })

      const result = await seedDegradationScenario('brewery-1')
      expect(result.success).toBe(true)
      expect(result.message).toContain('Degradation scenario')
      expect(mockFrom).toHaveBeenCalledWith('inventory')
      expect(mockInsert).toHaveBeenCalled()
      const items = mockInsert.mock.calls[0]?.[0]
      expect(items).toHaveLength(3)
      expect(items[0]).toHaveProperty('hsi_initial')
      expect(items[0]).toHaveProperty('degradation_tracked', true)
    })
  })

  describe('seedFermentationAlerts', () => {
    it('returns error when no active batch found', async () => {
      createChain()
      mockSingle.mockResolvedValue({ data: null, error: null })

      const result = await seedFermentationAlerts('brewery-1')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/No active batch found/)
    })

    it('creates alerts for an active batch', async () => {
      createChain()
      mockSingle.mockResolvedValue({ data: { id: 'batch-1' }, error: null })
      mockInsert.mockReturnValue({ error: null })

      const result = await seedFermentationAlerts('brewery-1')
      expect(result.success).toBe(true)
      expect(result.message).toContain('3 fermentation alerts')
      const alerts = mockInsert.mock.calls[0]?.[0]
      expect(alerts).toHaveLength(3)
      expect(alerts[0]).toHaveProperty('alert_type', 'temperature_deviation')
      expect(alerts[2]).toHaveProperty('alert_type', 'ph_out_of_range')
      expect(alerts[2]).toHaveProperty('severity', 'warning')
    })
  })
})
