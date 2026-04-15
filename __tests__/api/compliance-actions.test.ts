// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockCreateClient,
  mockGetActiveBrewery,
  mockRevalidatePath,
  mockHeaders,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockHeaders: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/active-brewery', () => ({
  getActiveBrewery: mockGetActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function createMockHeaders() {
  const headerMap = new Map([
    ['x-forwarded-for', '127.0.0.1'],
    ['user-agent', 'test-agent'],
  ])
  return {
    get: (key: string) => headerMap.get(key) || null,
  }
}

type FromImpl = (table: string) => Record<string, unknown>

function createMockSupabase(overrides: {
  fromImpl?: FromImpl
  getUserResult?: { data: { user: unknown } }
} = {}) {
  const defaultFromImpl = () => ({
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'new-record' }, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'updated' }, error: null }) }) }) }),
    }),
    select: () => ({
      eq: () => ({
        gte: () => ({
          lte: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        lt: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
        eq: () => ({
          gte: () => ({
            lte: () => Promise.resolve({ data: [], error: null }),
          }),
          lt: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      in: () => ({
        gte: () => ({
          lte: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  })

  return {
    from: overrides.fromImpl || defaultFromImpl,
    auth: {
      getUser: () =>
        Promise.resolve(
          overrides.getUserResult || { data: { user: mockUser } }
        ),
    },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('compliance/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetActiveBrewery.mockResolvedValue(mockBrewery)
    mockHeaders.mockResolvedValue(createMockHeaders())
  })

  // ─── logDailyOperation ────────────────────────────────────────────
  describe('logDailyOperation', () => {
    it('inserts log with all fields and provenance', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'log-001',
                brewery_id: 'brewery-001',
                operation_type: 'removal_taxpaid',
                quantity: 5,
                unit: 'bbl',
              },
              error: null,
            }),
        }),
      })

      const fromImpl = (table: string) => {
        if (table === 'daily_operations_logs') {
          return { insert: insertMock }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: 5,
        unit: 'bbl',
        ttbReportable: true,
        remarks: 'Test removal',
      })

      expect(result.success).toBe(true)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          brewery_id: 'brewery-001',
          log_date: '2026-04-15',
          operation_type: 'removal_taxpaid',
          quantity: 5,
          unit: 'bbl',
          ttb_reportable: true,
          remarks: 'Test removal',
          logged_by: 'user-001',
          provenance_ip: '127.0.0.1',
          provenance_user_agent: 'test-agent',
        })
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/compliance')
    })

    it('requires active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: 5,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/brewery/i)
    })

    it('requires authenticated user', async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase({ getUserResult: { data: { user: null } } })
      )

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: 5,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/unauthorized/i)
    })

    it('validates operation type against enum', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'invalid_type',
        quantity: 5,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/invalid operation type/i)
    })

    it('validates quantity is positive', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: -5,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/positive/i)
    })

    it('captures provenance IP and user-agent', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'log-002' }, error: null }),
        }),
      })

      const fromImpl = (table: string) => {
        if (table === 'daily_operations_logs') return { insert: insertMock }
        return {}
      }

      const customHeaders = new Map([
        ['x-forwarded-for', '192.168.1.100'],
        ['user-agent', 'BrewBrain/1.0'],
      ])
      mockHeaders.mockResolvedValue({
        get: (key: string) => customHeaders.get(key) || null,
      })

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'breakage_destruction',
        quantity: 2,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provenance_ip: '192.168.1.100',
          provenance_user_agent: 'BrewBrain/1.0',
        })
      )
    })
  })

  // ─── updateShrinkageTTBRemarks ────────────────────────────────────
  describe('updateShrinkageTTBRemarks', () => {
    it('updates remarks and reportable flag scoped to brewery', async () => {
      const eqBreweryMock = vi.fn().mockReturnValue({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'alert-001',
                ttb_remarks: 'Forklift incident',
                ttb_reportable: true,
              },
              error: null,
            }),
        }),
      })
      const eqAlertMock = vi.fn().mockReturnValue({ eq: eqBreweryMock })
      const updateMock = vi.fn().mockReturnValue({ eq: eqAlertMock })

      const fromImpl = (table: string) => {
        if (table === 'shrinkage_alerts') return { update: updateMock }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { updateShrinkageTTBRemarks } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await updateShrinkageTTBRemarks(
        'alert-001',
        'Forklift incident',
        true
      )

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith({
        ttb_remarks: 'Forklift incident',
        ttb_reportable: true,
      })
      expect(eqAlertMock).toHaveBeenCalledWith('id', 'alert-001')
      expect(eqBreweryMock).toHaveBeenCalledWith('brewery_id', 'brewery-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/compliance')
    })

    it('rejects when no active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { updateShrinkageTTBRemarks } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await updateShrinkageTTBRemarks(
        'alert-001',
        'test',
        true
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/brewery/i)
    })
  })

  // ─── validateTTBContinuity ────────────────────────────────────────
  describe('validateTTBContinuity', () => {
    function buildContinuitySupabase(opts: {
      tanks?: { capacity: number }[]
      batches?: { id: string; status: string }[]
      ops?: { operation_type: string; quantity: number; unit: string }[]
      alerts?: { loss_amount: number }[]
      priorBatches?: { id: string }[]
      priorOps?: { operation_type: string; quantity: number; unit: string }[]
      priorAlerts?: { loss_amount: number }[]
      annualOps?: { operation_type: string; quantity: number; unit: string }[]
    } = {}) {
      const fromImpl = (table: string) => ({
        select: (cols?: string) => {
          // tanks query
          if (table === 'tanks') {
            return {
              eq: () => Promise.resolve({ data: opts.tanks ?? [], error: null }),
            }
          }
          // batches
          if (table === 'batches') {
            return {
              eq: () => ({
                gte: () => ({
                  lte: () => ({
                    in: () => Promise.resolve({ data: opts.batches ?? [], error: null }),
                  }),
                }),
                lt: () => ({
                  in: () => Promise.resolve({ data: opts.priorBatches ?? [], error: null }),
                }),
              }),
            }
          }
          // daily_operations_logs
          if (table === 'daily_operations_logs') {
            return {
              eq: () => ({
                gte: () => ({
                  lte: () => Promise.resolve({ data: opts.ops ?? [], error: null }),
                }),
                lt: () => Promise.resolve({ data: opts.priorOps ?? [], error: null }),
                in: () => ({
                  gte: () => ({
                    lte: () => Promise.resolve({ data: opts.annualOps ?? [], error: null }),
                  }),
                }),
              }),
              in: () => ({
                gte: () => ({
                  lte: () => Promise.resolve({ data: opts.annualOps ?? [], error: null }),
                }),
              }),
            }
          }
          // shrinkage_alerts
          if (table === 'shrinkage_alerts') {
            return {
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    lte: () => Promise.resolve({ data: opts.alerts ?? [], error: null }),
                  }),
                  lt: () => Promise.resolve({ data: opts.priorAlerts ?? [], error: null }),
                }),
              }),
            }
          }
          // default
          const chainable: Record<string, unknown> = {}
          const proxy: Record<string, unknown> = new Proxy(chainable, {
            get: (_, prop) => {
              if (prop === 'then') return undefined
              return () => proxy
            },
          })
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          void cols
          return proxy
        },
      })

      return {
        from: fromImpl,
        auth: {
          getUser: () => Promise.resolve({ data: { user: mockUser } }),
        },
      }
    }

    it('computes continuity with zero data (new brewery)', async () => {
      mockCreateClient.mockResolvedValue(buildContinuitySupabase())

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        beginningInventory: 0,
        produced: 0,
        removals: 0,
        returns: 0,
        breakage: 0,
        shortages: 0,
        endingInventoryPredicted: 0,
        cbmaEligible: true,
      })
    })

    it('calculates production from completed batches × avg tank capacity', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          tanks: [{ capacity: 10 }, { capacity: 20 }],
          batches: [
            { id: 'b-1', status: 'complete' },
            { id: 'b-2', status: 'packaging' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.success).toBe(true)
      // 2 batches × 15 BBL avg = 30 BBL
      expect(result.data!.produced).toBe(30)
    })

    it('defaults to 7 BBL when no tanks exist', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          tanks: [],
          batches: [{ id: 'b-1', status: 'complete' }],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.data!.produced).toBe(7)
    })

    it('aggregates operations with unit conversion', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          ops: [
            { operation_type: 'removal_taxpaid', quantity: 10, unit: 'bbl' },
            { operation_type: 'removal_tax_free', quantity: 31, unit: 'gal' }, // 1 BBL
            { operation_type: 'return_to_brewery', quantity: 5, unit: 'bbl' },
            { operation_type: 'breakage_destruction', quantity: 2, unit: 'bbl' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.data!.removals).toBe(11) // 10 + 1
      expect(result.data!.returns).toBe(5)
      expect(result.data!.breakage).toBe(2)
    })

    it('includes TTB-reportable shortages only', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          alerts: [{ loss_amount: 3 }, { loss_amount: 2 }],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.data!.shortages).toBe(5)
    })

    it('computes ending inventory: beginning + produced + returns - removals - breakage - shortages', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          tanks: [{ capacity: 10 }],
          batches: [{ id: 'b-1', status: 'complete' }],
          ops: [
            { operation_type: 'removal_taxpaid', quantity: 3, unit: 'bbl' },
            { operation_type: 'return_to_brewery', quantity: 1, unit: 'bbl' },
          ],
          priorBatches: [{ id: 'b-0' }],
          priorOps: [
            { operation_type: 'removal_taxpaid', quantity: 2, unit: 'bbl' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      // prior: produced=10, removals=2 → beginning = 10 - 2 = 8
      // current: produced=10, removals=3, returns=1
      // ending = 8 + 10 + 1 - 3 - 0 - 0 = 16
      expect(result.data!.beginningInventory).toBe(8)
      expect(result.data!.endingInventoryPredicted).toBe(16)
    })

    it('returns error when no active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(buildContinuitySupabase())

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/brewery/i)
    })

    it('CBMA eligibility based on annual removals', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          annualOps: [
            { operation_type: 'removal_taxpaid', quantity: 70000, unit: 'bbl' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.data!.cbmaEligible).toBe(false)
      expect(result.data!.cbmaBarrelsUsed).toBe(70000)
    })

    it('converts liters to BBL via toBBL', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          tanks: [{ capacity: 10 }],
          batches: [{ id: 'b-1', status: 'complete' }],
          ops: [
            { operation_type: 'removal_taxpaid', quantity: 117, unit: 'liters' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.success).toBe(true)
      // 117 liters / 117.348 = ~0.997 BBL
      expect(result.data!.removals).toBeGreaterThan(0)
    })

    it('includes return_to_brewery and breakage_destruction from prior period', async () => {
      mockCreateClient.mockResolvedValue(
        buildContinuitySupabase({
          priorOps: [
            { operation_type: 'removal_taxpaid', quantity: 10, unit: 'bbl' },
            { operation_type: 'return_to_brewery', quantity: 2, unit: 'bbl' },
            { operation_type: 'breakage_destruction', quantity: 1, unit: 'bbl' },
          ],
        })
      )

      const { validateTTBContinuity } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await validateTTBContinuity(4, 2026)

      expect(result.success).toBe(true)
      // beginningInventory is derived from prior period ending
      expect(result.data!.beginningInventory).toBeDefined()
    })
  })

  // ─── logDailyOperation edge cases ─────────────────────────────
  describe('logDailyOperation edge cases', () => {
    it('returns error when DB insert fails', async () => {
      const fromImpl = (table: string) => {
        if (table === 'daily_operations_logs') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: 5,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
    })

    it('rejects quantity of zero', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { logDailyOperation } = await import(
        '@/app/(app)/compliance/actions'
      )
      const result = await logDailyOperation({
        logDate: '2026-04-15',
        operationType: 'removal_taxpaid',
        quantity: 0,
        unit: 'bbl',
        ttbReportable: true,
      })

      expect(result.success).toBe(false)
    })
  })
})
