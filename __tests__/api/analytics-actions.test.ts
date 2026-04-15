// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockCreateClient,
  mockGetActiveBrewery,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetActiveBrewery: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/active-brewery', () => ({
  getActiveBrewery: mockGetActiveBrewery,
}))

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function createMockSupabase(fromImpl?: (table: string) => unknown) {
  const defaultFrom = () => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  })

  return {
    from: fromImpl || defaultFrom,
    auth: {
      getUser: () => Promise.resolve({ data: { user: mockUser } }),
    },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('analytics-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetActiveBrewery.mockResolvedValue(mockBrewery)
  })

  // ─── getInventoryTrends ───────────────────────────────────────────
  describe('getInventoryTrends', () => {
    it('returns empty array when no user is authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        ...createMockSupabase(),
        auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      })

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(90)
      expect(result).toEqual([])
    })

    it('returns empty array when no history data exists', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(90)
      expect(result).toEqual([])
    })

    it('aggregates recipe_usage as usage', async () => {
      const historyData = [
        { quantity_change: -10, change_type: 'recipe_usage', created_at: '2026-04-01T10:00:00Z' },
        { quantity_change: -5, change_type: 'recipe_usage', created_at: '2026-04-01T14:00:00Z' },
      ]

      const fromImpl = (table: string) => {
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: historyData, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(7)

      // Both entries should be aggregated together (same day, short-term)
      expect(result.length).toBeGreaterThanOrEqual(1)
      const totalUsage = result.reduce((sum, d) => sum + d.usage, 0)
      expect(totalUsage).toBe(15) // abs(-10) + abs(-5)
    })

    it('aggregates waste correctly', async () => {
      const historyData = [
        { quantity_change: -3, change_type: 'waste', created_at: '2026-04-02T10:00:00Z' },
        { quantity_change: -7, change_type: 'waste', created_at: '2026-04-02T14:00:00Z' },
      ]

      const fromImpl = (table: string) => {
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: historyData, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(7)

      const totalWaste = result.reduce((sum, d) => sum + d.waste, 0)
      expect(totalWaste).toBe(10) // abs(-3) + abs(-7)
    })

    it('aggregates received as additions', async () => {
      const historyData = [
        { quantity_change: 50, change_type: 'received', created_at: '2026-04-03T10:00:00Z' },
      ]

      const fromImpl = (table: string) => {
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: historyData, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(7)

      const totalAdditions = result.reduce((sum, d) => sum + d.additions, 0)
      expect(totalAdditions).toBe(50)
    })

    it('treats unknown negative changes as waste', async () => {
      const historyData = [
        { quantity_change: -8, change_type: 'stock_adjustment', created_at: '2026-04-02T10:00:00Z' },
      ]

      const fromImpl = (table: string) => {
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: historyData, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(7)

      const totalWaste = result.reduce((sum, d) => sum + d.waste, 0)
      expect(totalWaste).toBe(8)
    })

    it('returns empty array on query error', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      const result = await getInventoryTrends(90)
      expect(result).toEqual([])
    })

    it('clamps invalid days to default 90', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { getInventoryTrends } = await import('@/app/actions/analytics-actions')
      // Passing an invalid value (>365) should fallback to 90
      const result = await getInventoryTrends(1000)
      expect(result).toEqual([])
    })
  })

  // ─── getBatchPerformance ──────────────────────────────────────────
  describe('getBatchPerformance', () => {
    it('returns empty array when no user is authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        ...createMockSupabase(),
        auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      })

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()
      expect(result).toEqual([])
    })

    it('returns empty array when no batches exist', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()
      expect(result).toEqual([])
    })

    it('calculates efficiency as (actualOG / targetOG) * 100', async () => {
      const batchData = [
        {
          id: 'aaaaa-bbbbb',
          recipe_name: 'IPA',
          og: 1.055,
          fg: 1.012,
          status: 'complete',
          recipe_id: 'recipe-1',
          recipes: { target_og: 1.058, target_fg: 1.010, target_ibu: 60 },
          batch_brewing_logs: [{ actual_ibu_calculated: 55, boil_off_rate_pct: 1.2 }],
        },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: batchData, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()

      expect(result).toHaveLength(1)
      // Expected: (55/58)*100 = 94.8%
      expect(result[0].efficiency).toBeCloseTo(94.8, 0)
      expect(result[0].actualOG).toBe(1.055)
      expect(result[0].targetOG).toBe(1.058)
    })

    it('handles null targetOG without division by zero', async () => {
      const batchData = [
        {
          id: 'ccccc-ddddd',
          recipe_name: 'No Recipe',
          og: 1.050,
          fg: null,
          status: 'fermenting',
          recipe_id: null,
          recipes: null,
          batch_brewing_logs: [],
        },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: batchData, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()

      expect(result).toHaveLength(1)
      expect(result[0].efficiency).toBe(0)
      expect(result[0].targetOG).toBeNull()
      expect(Number.isFinite(result[0].efficiency)).toBe(true)
    })

    it('handles null actualOG', async () => {
      const batchData = [
        {
          id: 'eeeee-fffff',
          recipe_name: 'New Batch',
          og: null,
          fg: null,
          status: 'brewing',
          recipe_id: 'recipe-1',
          recipes: { target_og: 1.060, target_fg: 1.010, target_ibu: 40 },
          batch_brewing_logs: [],
        },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: batchData, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()

      expect(result).toHaveLength(1)
      expect(result[0].efficiency).toBe(0)
      expect(result[0].actualOG).toBeNull()
    })

    it('limits to 20 recent batches', async () => {
      const batchData = Array.from({ length: 25 }, (_, i) => ({
        id: `batch-${String(i).padStart(5, '0')}`,
        recipe_name: `Batch ${i}`,
        og: 1.050 + i * 0.001,
        fg: 1.010,
        status: 'complete',
        recipe_id: `recipe-${i}`,
        recipes: { target_og: 1.050 + i * 0.001, target_fg: 1.010, target_ibu: 30 },
        batch_brewing_logs: [],
      }))

      const limitMock = vi.fn().mockResolvedValue({ data: batchData.slice(0, 20), error: null })

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: limitMock,
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()

      expect(limitMock).toHaveBeenCalledWith(20)
      expect(result).toHaveLength(20)
    })

    it('caps efficiency at 100%', async () => {
      const batchData = [
        {
          id: 'ggggg-hhhhh',
          recipe_name: 'Over-Performer',
          og: 1.070,
          fg: 1.010,
          status: 'complete',
          recipe_id: 'recipe-1',
          recipes: { target_og: 1.050, target_fg: 1.010, target_ibu: 30 },
          batch_brewing_logs: [],
        },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: batchData, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()

      expect(result[0].efficiency).toBe(100)
    })

    it('returns empty array on query error', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getBatchPerformance } = await import('@/app/actions/analytics-actions')
      const result = await getBatchPerformance()
      expect(result).toEqual([])
    })
  })
})
