// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockCreateClient,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

// ─── Helpers ────────────────────────────────────────────────────────
function createMockSupabase(fromImpl?: (table: string) => unknown) {
  const defaultFrom = () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        gte: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  })

  return {
    from: fromImpl || defaultFrom,
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-001' } } }),
    },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('supplier-actions analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ─── getSupplierAnalytics ──────────────────────────────────────────
  describe('getSupplierAnalytics', () => {
    it('returns empty data when no suppliers exist', async () => {
      const fromImpl = (table: string) => {
        if (table === 'suppliers') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierAnalytics } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierAnalytics('brewery-001')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('computes average ratings for a supplier with ratings', async () => {
      const fromImpl = (table: string) => {
        if (table === 'suppliers') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'sup-1', name: 'Grain Co', supplier_type: 'Direct', is_active: true }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'supplier_ratings') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => Promise.resolve({
                  data: [
                    { quality_rating: 4, delivery_rating: 5, reliability_rating: 4, pricing_rating: 3, would_order_again: true },
                    { quality_rating: 5, delivery_rating: 4, reliability_rating: 5, pricing_rating: 4, would_order_again: true },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'purchase_orders') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierAnalytics } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierAnalytics('brewery-001', 90)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)

      const analytics = result.data![0]
      expect(analytics.supplierName).toBe('Grain Co')
      expect(analytics.avgQualityRating).toBe(4.5)
      expect(analytics.avgDeliveryRating).toBe(4.5)
      expect(analytics.avgReliabilityRating).toBe(4.5)
      expect(analytics.avgPricingRating).toBe(3.5)
      expect(analytics.overallScore).toBe(4.3) // (4.5 + 4.5 + 4.5 + 3.5) / 4 = 4.25 → rounded 4.3
      expect(analytics.wouldOrderAgainPercent).toBe(100)
    })

    it('handles supplier with no ratings gracefully', async () => {
      const fromImpl = (table: string) => {
        if (table === 'suppliers') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'sup-2', name: 'New Supplier', supplier_type: 'Cooperative', is_active: true }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'supplier_ratings') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'purchase_orders') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierAnalytics } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierAnalytics('brewery-001')

      expect(result.success).toBe(true)
      const analytics = result.data![0]
      expect(analytics.avgQualityRating).toBe(0)
      expect(analytics.overallScore).toBe(0)
      expect(analytics.wouldOrderAgainPercent).toBe(0)
    })

    it('returns error on database failure', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'Connection lost' } }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierAnalytics } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierAnalytics('brewery-001')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ─── getSupplierTrends ─────────────────────────────────────────────
  describe('getSupplierTrends', () => {
    it('returns empty trends when no ratings exist', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierTrends } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierTrends('sup-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('groups ratings by date and calculates daily averages', async () => {
      const ratings = [
        { rating_date: '2026-04-01', quality_rating: 4, delivery_rating: 5, reliability_rating: 4, pricing_rating: 3 },
        { rating_date: '2026-04-01', quality_rating: 5, delivery_rating: 4, reliability_rating: 5, pricing_rating: 4 },
        { rating_date: '2026-04-05', quality_rating: 3, delivery_rating: 3, reliability_rating: 3, pricing_rating: 3 },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: ratings, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierTrends } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierTrends('sup-1', 90)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2) // Two distinct dates

      // First date: avg of 2 ratings
      const firstDay = result.data![0]
      expect(firstDay.quality).toBe(4.5)
      expect(firstDay.delivery).toBe(4.5)

      // Second date: single rating
      const secondDay = result.data![1]
      expect(secondDay.quality).toBe(3)
      expect(secondDay.overall).toBe(3)
    })

    it('returns error on query failure', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'Query failed' } }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierTrends } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierTrends('sup-1')

      expect(result.success).toBe(false)
    })
  })

  // ─── getSupplierQualityIssues ──────────────────────────────────────
  describe('getSupplierQualityIssues', () => {
    it('returns correct issue metrics', async () => {
      let queryCount = 0

      const fromImpl = (table: string) => {
        if (table === 'purchase_orders') {
          queryCount++
          if (queryCount === 1) {
            // Orders with issues (any_issues = true)
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      gte: () => Promise.resolve({
                        data: [
                          { id: 'po-1', order_number: 'PO-001', any_issues: true, order_date: '2026-04-01' },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          // All orders (total count)
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => Promise.resolve({
                    data: [
                      { id: 'po-1' },
                      { id: 'po-2' },
                      { id: 'po-3' },
                      { id: 'po-4' },
                      { id: 'po-5' },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'supplier_ratings') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => Promise.resolve({
                    data: [
                      { quality_rating: 2.0, comments: 'Bad shipping damage', rating_date: '2026-04-01' },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierQualityIssues } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierQualityIssues('sup-1', 'brewery-001')

      expect(result.success).toBe(true)
      expect(result.data.issueOrderCount).toBe(1)
      expect(result.data.totalOrdersReviewed).toBe(5)
      expect(result.data.issuePercent).toBe(20)
      expect(result.data.lowQualityRatings).toHaveLength(1)
    })

    it('returns 0% issues when no orders have issues', async () => {
      const fromImpl = (table: string) => {
        if (table === 'purchase_orders') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => Promise.resolve({ data: [], error: null }),
                  }),
                  gte: () => Promise.resolve({
                    data: [{ id: 'po-1' }, { id: 'po-2' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'supplier_ratings') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierQualityIssues } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierQualityIssues('sup-1', 'brewery-001')

      expect(result.success).toBe(true)
      expect(result.data.issuePercent).toBe(0)
      expect(result.data.recentIssueOrders).toEqual([])
    })

    it('handles zero orders without division by zero', async () => {
      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => Promise.resolve({ data: [], error: null }),
              }),
              gte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase(fromImpl))

      const { getSupplierQualityIssues } = await import('@/app/actions/supplier-actions')
      const result = await getSupplierQualityIssues('sup-1', 'brewery-001')

      expect(result.success).toBe(true)
      expect(result.data.issuePercent).toBe(0)
      expect(Number.isFinite(result.data.issuePercent)).toBe(true)
    })
  })
})
