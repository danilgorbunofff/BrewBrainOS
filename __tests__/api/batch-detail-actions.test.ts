// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockFrom,
  mockHeaders,
  mockDetectFermentationAlerts,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockHeaders: vi.fn(),
  mockDetectFermentationAlerts: vi.fn(),
  mockSendNotification: vi.fn(),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

vi.mock('@/lib/fermentation-alerts', () => ({
  detectFermentationAlerts: mockDetectFermentationAlerts,
}))

vi.mock('@/app/actions/push-actions', () => ({
  sendFermentationAlertNotification: mockSendNotification,
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/utils')>()
  return { ...original }
})

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function setupHeaders() {
  mockHeaders.mockResolvedValue({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return '127.0.0.1'
      if (name === 'user-agent') return 'test-agent'
      return null
    },
  })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('batches/[id]/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupHeaders()
    mockDetectFermentationAlerts.mockReturnValue([])
    mockSendNotification.mockResolvedValue(undefined)
  })

  // ─── updateBatchStatus ──────────────────────────────────────────
  describe('updateBatchStatus', () => {
    it('updates status field for valid status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      mockFrom.mockReturnValue({ update: mockUpdate })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchStatus } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchStatus(makeFormData({ batchId: 'b-001', status: 'conditioning' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('batches')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'conditioning' })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/b-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches')
    })

    it('rejects invalid status values', async () => {
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchStatus } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchStatus(makeFormData({ batchId: 'b-001', status: 'hacked' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Invalid batch status/)
    })

    it('accepts dumped as a valid status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      mockFrom.mockReturnValue({ update: mockUpdate })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchStatus } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchStatus(makeFormData({ batchId: 'b-001', status: 'dumped' }))

      expect(result.success).toBe(true)
    })

    it('requires batchId', async () => {
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchStatus } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchStatus(makeFormData({ status: 'complete' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch ID/i)
    })
  })

  // ─── updateBatchFG ──────────────────────────────────────────────
  describe('updateBatchFG', () => {
    function setupFGMocks() {
      let callCount = 0
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })
      const mockAuth = { getUser: mockGetUser }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'batches' && callCount === 0) {
          callCount++
          // First call: update FG
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        if (table === 'batch_readings') {
          // Insert reading
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        if (table === 'batches') {
          // runFermentationAlertCheck — fetch batch config
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { target_temp: 20 }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'fermentation_alerts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      })

      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: mockAuth },
        user: mockUser,
        brewery: mockBrewery,
      })
    }

    it('updates FG and creates batch reading', async () => {
      setupFGMocks()

      const { updateBatchFG } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchFG(makeFormData({ batchId: 'b-001', fg: '1.012' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('batches')
      expect(mockFrom).toHaveBeenCalledWith('batch_readings')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/b-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    })

    it('rejects NaN gravity values', async () => {
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchFG } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchFG(makeFormData({ batchId: 'b-001', fg: 'not-a-number' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Invalid gravity/i)
    })

    it('requires batchId', async () => {
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { updateBatchFG } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await updateBatchFG(makeFormData({ fg: '1.010' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch ID/i)
    })
  })

  // ─── logManualReading ───────────────────────────────────────────
  describe('logManualReading', () => {
    function setupReadingMock(insertResult: { error: unknown } = { error: null }) {
      let fromCallCount = 0
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })
      const mockAuth = { getUser: mockGetUser }

      mockFrom.mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'batch_readings' && fromCallCount === 1) {
          return { insert: vi.fn().mockResolvedValue(insertResult) }
        }
        if (table === 'batches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { target_temp: 20 }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'batch_readings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'fermentation_alerts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      })

      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: mockAuth },
        user: mockUser,
        brewery: mockBrewery,
      })
    }

    it('inserts reading with all sensor fields', async () => {
      setupReadingMock()

      const { logManualReading } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logManualReading(
        makeFormData({
          batchId: 'b-001',
          temperature: '20.5',
          gravity: '1.048',
          ph: '4.3',
          dissolved_oxygen: '0.1',
          pressure: '12',
          notes: 'Test reading',
        }),
      )

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('batch_readings')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/b-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    })

    it('handles all-null sensor values', async () => {
      setupReadingMock()

      const { logManualReading } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logManualReading(makeFormData({ batchId: 'b-001' }))

      expect(result.success).toBe(true)
    })

    it('deduplicates by external_id — returns success', async () => {
      setupReadingMock({
        error: { code: '23505', message: 'duplicate key value violates unique constraint', details: 'Key (external_id)=(dup-id) already exists' },
      })

      const { logManualReading } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logManualReading(
        makeFormData({ batchId: 'b-001', external_id: 'dup-id', gravity: '1.050' }),
      )

      expect(result.success).toBe(true)
    })

    it('requires batchId', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { logManualReading } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logManualReading(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch ID/i)
    })
  })

  // ─── logYeastViability ──────────────────────────────────────────
  describe('logYeastViability', () => {
    it('inserts with brewery_id and logged_by', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })

      mockFrom.mockReturnValue({ insert: mockInsert })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { logYeastViability } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logYeastViability(
        makeFormData({ batchId: 'b-001', viability_pct: '92', cell_density: '150', pitch_rate: '0.75', notes: 'Healthy yeast' }),
      )

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('yeast_logs')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_id: 'b-001',
          brewery_id: 'brewery-001',
          logged_by: 'user-001',
          viability_pct: 92,
          cell_density: 150,
          pitch_rate: 0.75,
        }),
      )
    })

    it('requires batchId', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { logYeastViability } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await logYeastViability(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch ID/i)
    })
  })

  // ─── runFermentationAlertCheck ──────────────────────────────────
  describe('runFermentationAlertCheck', () => {
    it('returns 0 alerts_created when batch has no readings', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'batches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { target_temp: 20 }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'batch_readings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { runFermentationAlertCheck } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await runFermentationAlertCheck('b-001')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ alerts_created: 0 })
    })

    it('creates alerts and sends notifications when anomalies detected', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'fa-1', alert_type: 'temp_spike', severity: 'warning', message: 'Temp spike', batch_id: 'b-001', brewery_id: 'brewery-001' },
          ],
          error: null,
        }),
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'batches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { target_temp: 20 }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'batch_readings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'r-1', gravity: 1.05, temperature: 30, ph: 4.2, dissolved_oxygen: 0.1, pressure: 12, created_at: new Date().toISOString() }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'fermentation_alerts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: mockInsert,
          }
        }
        return {}
      })

      mockDetectFermentationAlerts.mockReturnValue([
        { alert_type: 'temp_spike', severity: 'warning', message: 'Temp spike', threshold_value: 22, actual_value: 30 },
      ])

      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { runFermentationAlertCheck } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await runFermentationAlertCheck('b-001')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ alerts_created: 1 })
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          batch_id: 'b-001',
          brewery_id: 'brewery-001',
          alert_type: 'temp_spike',
          severity: 'warning',
          status: 'active',
        }),
      ])
      expect(mockSendNotification).toHaveBeenCalled()
    })

    it('skips already-active alert types (deduplication)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'batches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { target_temp: 20 }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'batch_readings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'r-1', gravity: 1.05, temperature: 30, ph: 4.2, dissolved_oxygen: 0.1, pressure: 12, created_at: new Date().toISOString() }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'fermentation_alerts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ alert_type: 'temp_spike' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockDetectFermentationAlerts.mockReturnValue([
        { alert_type: 'temp_spike', severity: 'warning', message: 'Temp spike', threshold_value: 22, actual_value: 30 },
      ])

      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { runFermentationAlertCheck } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await runFermentationAlertCheck('b-001')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ alerts_created: 0 })
    })

    it('returns error when auth fails', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('Not authenticated'))

      const { runFermentationAlertCheck } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await runFermentationAlertCheck('b-001')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Not authenticated/)
    })
  })

  // ─── acknowledgeAlert ──────────────────────────────────────────
  describe('acknowledgeAlert', () => {
    it('sets status to acknowledged with timestamp', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({ error: null })
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })

      mockFrom.mockReturnValue({ update: mockUpdate })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { acknowledgeAlert } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await acknowledgeAlert(makeFormData({ alertId: 'alert-001', batchId: 'b-001' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('fermentation_alerts')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          acknowledged_by: 'user-001',
        }),
      )
      // Verify .eq('status', 'active') is in the chain — only active alerts can be acknowledged
      expect(mockEq3).toHaveBeenCalledWith('status', 'active')
    })

    it('requires alertId', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } })
      mockRequireActiveBrewery.mockResolvedValue({
        supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
        user: mockUser,
        brewery: mockBrewery,
      })

      const { acknowledgeAlert } = await import('../../src/app/(app)/batches/[id]/actions')
      const result = await acknowledgeAlert(makeFormData({ batchId: 'b-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Alert ID/i)
    })
  })
})
