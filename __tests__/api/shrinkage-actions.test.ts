// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockCreateClient,
  mockGetActiveBrewery,
  mockRevalidatePath,
  mockHeaders,
  mockCheckAndCreateReorderAlert,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockHeaders: vi.fn(),
  mockCheckAndCreateReorderAlert: vi.fn(),
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

vi.mock('@/app/actions/reorder-actions', () => ({
  checkAndCreateReorderAlert: mockCheckAndCreateReorderAlert,
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

function createMockSupabase(overrides: {
  fromImpl?: (...args: unknown[]) => unknown
  getUserResult?: { data: { user: unknown } }
} = {}) {
  const defaultFromImpl = () => ({
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'new-record' }, error: null }) }) }),
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        gte: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
    update: () => ({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  })

  return {
    from: overrides.fromImpl || defaultFromImpl,
    auth: {
      getUser: () => Promise.resolve(overrides.getUserResult || { data: { user: mockUser } }),
    },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('shrinkage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetActiveBrewery.mockResolvedValue(mockBrewery)
    mockHeaders.mockResolvedValue(createMockHeaders())
    mockCheckAndCreateReorderAlert.mockResolvedValue(undefined)
  })

  // ─── recordInventoryChange ────────────────────────────────────────
  describe('recordInventoryChange', () => {
    it('creates inventory_history entry with correct fields', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'history-001',
              inventory_id: 'item-001',
              brewery_id: 'brewery-001',
              previous_stock: 100,
              current_stock: 85,
              quantity_change: -15,
              change_type: 'recipe_usage',
            },
            error: null,
          }),
        }),
      })

      // Build a from implementation that handles multiple table queries
      const fromImpl = (table: string) => {
        if (table === 'inventory_history') {
          return { insert: insertMock }
        }
        // inventory table for baseline and alert detection
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { name: 'Cascade', unit: 'lbs', reorder_point: 10, avg_weekly_usage: null },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        // shrinkage_baselines
        if (table === 'shrinkage_baselines') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
            insert: () => Promise.resolve({ error: null }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { recordInventoryChange } = await import('@/app/actions/shrinkage')
      const result = await recordInventoryChange(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        100,
        85,
        'recipe_usage',
        'Used in Hazy IPA',
      )

      expect(result.success).toBe(true)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          brewery_id: 'brewery-001',
          previous_stock: 100,
          current_stock: 85,
          quantity_change: -15,
          change_type: 'recipe_usage',
          reason: 'Used in Hazy IPA',
        }),
      )
    })

    it('returns error when no active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { recordInventoryChange } = await import('@/app/actions/shrinkage')
      const result = await recordInventoryChange(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        100,
        85,
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active brewery')
    })

    it('returns error when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase({
          getUserResult: { data: { user: null } },
        }),
      )

      const { recordInventoryChange } = await import('@/app/actions/shrinkage')
      const result = await recordInventoryChange(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        100,
        85,
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('validates input with inventoryChangeSchema', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { recordInventoryChange } = await import('@/app/actions/shrinkage')
      // Invalid UUID
      const result = await recordInventoryChange('not-a-uuid', 100, 85)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })
  })

  // ─── recalculateShrinkageBaseline ──────────────────────────────
  describe('recalculateShrinkageBaseline', () => {
    it('updates existing baseline when one exists', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: () => Promise.resolve({ error: null }),
      })

      const fromImpl = (table: string) => {
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { id: 'item-001', name: 'Cascade Hops' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({
                    data: [
                      { quantity_change: -5, created_at: '2026-03-01' },
                      { quantity_change: -3, created_at: '2026-02-15' },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'shrinkage_baselines') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'baseline-001' }, error: null }),
              }),
            }),
            update: updateMock,
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { recalculateShrinkageBaseline } = await import('@/app/actions/shrinkage')
      const result = await recalculateShrinkageBaseline('item-001')

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalled()
    })

    it('inserts new baseline when none exists', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null })

      const fromImpl = (table: string) => {
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { id: 'item-002' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'shrinkage_baselines') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
            insert: insertMock,
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { recalculateShrinkageBaseline } = await import('@/app/actions/shrinkage')
      const result = await recalculateShrinkageBaseline('item-002')

      expect(result.success).toBe(true)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory_id: 'item-002',
          brewery_id: 'brewery-001',
          analysis_period_days: 90,
        }),
      )
    })

    it('returns error when no active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { recalculateShrinkageBaseline } = await import('@/app/actions/shrinkage')
      const result = await recalculateShrinkageBaseline('item-001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active brewery')
    })

    it('returns error when inventory not found', async () => {
      const fromImpl = (table: string) => {
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { recalculateShrinkageBaseline } = await import('@/app/actions/shrinkage')
      const result = await recalculateShrinkageBaseline('missing-item')

      expect(result.success).toBe(false)
    })
  })

  // ─── detectAndCreateShrinkageAlert ───────────────────────────────
  describe('detectAndCreateShrinkageAlert', () => {
    it('returns null when no baseline exists', async () => {
      const fromImpl = (table: string) => {
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { id: 'item-001', current_stock: 50, name: 'Hops' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'shrinkage_baselines') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { detectAndCreateShrinkageAlert } = await import('@/app/actions/shrinkage')
      const result = await detectAndCreateShrinkageAlert('item-001')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('returns error when no active brewery', async () => {
      mockGetActiveBrewery.mockResolvedValue(null)
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { detectAndCreateShrinkageAlert } = await import('@/app/actions/shrinkage')
      const result = await detectAndCreateShrinkageAlert('item-001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active brewery')
    })

    it('returns error when inventory item not found', async () => {
      const fromImpl = (table: string) => {
        if (table === 'inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
                }),
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { detectAndCreateShrinkageAlert } = await import('@/app/actions/shrinkage')
      const result = await detectAndCreateShrinkageAlert('missing')

      expect(result.success).toBe(false)
    })
  })

  // ─── updateShrinkageAlertStatus ──────────────────────────────────
  describe('updateShrinkageAlertStatus', () => {
    it('updates alert status and sets resolved_at for resolved status', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      })

      const fromImpl = (table: string) => {
        if (table === 'shrinkage_alerts') {
          return { update: updateMock }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { updateShrinkageAlertStatus } = await import('@/app/actions/shrinkage')
      const result = await updateShrinkageAlertStatus(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'resolved',
        'Confirmed waste disposal',
      )

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          notes: 'Confirmed waste disposal',
          resolved_at: expect.any(String),
        }),
      )
    })

    it('validates input schema', async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase())

      const { updateShrinkageAlertStatus } = await import('@/app/actions/shrinkage')
      // Invalid UUID
      const result = await updateShrinkageAlertStatus('bad-id', 'resolved')

      expect(result.success).toBe(false)
    })

    it('accepts all valid status transitions', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      })

      const fromImpl = () => ({ update: updateMock })
      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { updateShrinkageAlertStatus } = await import('@/app/actions/shrinkage')
      const validStatuses = ['unresolved', 'acknowledged', 'investigating', 'resolved', 'false_positive'] as const

      for (const status of validStatuses) {
        vi.clearAllMocks()
        mockGetActiveBrewery.mockResolvedValue(mockBrewery)
        mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

        const result = await updateShrinkageAlertStatus(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          status,
        )
        expect(result.success).toBe(true)
      }
    })
  })

  // ─── getShrinkageAlerts ──────────────────────────────────────────
  describe('getShrinkageAlerts', () => {
    it('returns alerts filtered by status', async () => {
      const mockAlerts = [
        { id: 'alert-1', severity: 'high', status: 'unresolved' },
        { id: 'alert-2', severity: 'critical', status: 'unresolved' },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockAlerts, error: null }),
            }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { getShrinkageAlerts } = await import('@/app/actions/shrinkage')
      const result = await getShrinkageAlerts('unresolved')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })

    it('returns all alerts when status is "all"', async () => {
      const mockAlerts = [
        { id: 'alert-1', severity: 'high', status: 'unresolved' },
        { id: 'alert-2', severity: 'low', status: 'resolved' },
      ]

      const fromImpl = () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockAlerts, error: null }),
          }),
        }),
      })

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { getShrinkageAlerts } = await import('@/app/actions/shrinkage')
      const result = await getShrinkageAlerts('all')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })
  })

  // ─── getShrinkageStats ───────────────────────────────────────────
  describe('getShrinkageStats', () => {
    it('returns aggregated shrinkage statistics', async () => {
      const fromImpl = (table: string) => {
        if (table === 'shrinkage_alerts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({
                  data: [
                    { severity: 'critical' },
                    { severity: 'high' },
                    { severity: 'critical' },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'inventory_history') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => Promise.resolve({
                    data: [
                      { quantity_change: -10 },
                      { quantity_change: -5 },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'shrinkage_baselines') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ average_monthly_loss: 8 }, { average_monthly_loss: 12 }],
                error: null,
              }),
            }),
          }
        }
        return {}
      }

      mockCreateClient.mockResolvedValue(createMockSupabase({ fromImpl }))

      const { getShrinkageStats } = await import('@/app/actions/shrinkage')
      const result = await getShrinkageStats()

      expect(result.success).toBe(true)
      expect(result.data?.total_alerts).toBe(3)
      expect(result.data?.critical_alerts).toBe(2)
      expect(result.data?.this_month_loss).toBe(15)
      expect(result.data?.average_monthly_loss).toBe(10)
    })
  })
})
