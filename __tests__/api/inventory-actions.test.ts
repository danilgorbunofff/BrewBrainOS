// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockFrom,
  mockInsert,
  mockRecordInventoryChange,
  mockSendInventoryAlert,
  mockGetUser,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockRecordInventoryChange: vi.fn(),
  mockSendInventoryAlert: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/app/actions/push-actions', () => ({
  sendInventoryAlert: mockSendInventoryAlert,
}))

vi.mock('@/app/actions/shrinkage', () => ({
  recordInventoryChange: mockRecordInventoryChange,
}))

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function stubInsert(result: { error: unknown } = { error: null }) {
  mockInsert.mockResolvedValue(result)
  mockFrom.mockReturnValue({ insert: mockInsert })
}

function stubDeleteChain(result: { error: unknown } = { error: null }) {
  mockFrom.mockReturnValue({
    delete: () => ({ eq: () => ({ eq: () => result }) }),
  })
}

function stubSelectThenUpdate(
  selectResult: { data: unknown; error: unknown },
  updateResult: { error: unknown } = { error: null },
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // select call (fetch current stock)
      return {
        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve(selectResult) }) }) }),
      }
    }
    // update call
    return {
      update: () => ({ eq: () => ({ eq: () => updateResult }) }),
    }
  })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('inventory/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRecordInventoryChange.mockResolvedValue({ success: true, data: null })
    mockSendInventoryAlert.mockResolvedValue(undefined)
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockRequireActiveBrewery.mockResolvedValue({
      supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
      user: mockUser,
      brewery: mockBrewery,
    })
  })

  // ─── addInventoryItem ────────────────────────────────────────────
  describe('addInventoryItem', () => {
    it('creates item with brewery_id and correct type mapping', async () => {
      stubInsert({ error: null })

      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')
      const result = await addInventoryItem(
        makeFormData({
          name: 'Cascade',
          itemType: 'hop',
          currentStock: '25',
          unit: 'lbs',
          reorderPoint: '5',
        }),
      )

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('inventory')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cascade',
          item_type: 'Hops',
          current_stock: 25,
          unit: 'lbs',
          brewery_id: 'brewery-001',
        }),
      )
    })

    it('sets degradation_tracked for hop type with HSI initial', async () => {
      stubInsert({ error: null })

      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')
      await addInventoryItem(
        makeFormData({
          name: 'Centennial',
          itemType: 'hop',
          currentStock: '10',
          unit: 'lbs',
          hsiInitial: '95',
          storageCondition: 'cool_dry',
        }),
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          hsi_initial: 95,
          hsi_current: 95,
        }),
      )
    })

    it('sets grain moisture and PPG for grain type', async () => {
      stubInsert({ error: null })

      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')
      await addInventoryItem(
        makeFormData({
          name: 'Pilsner Malt',
          itemType: 'grain',
          currentStock: '500',
          unit: 'lbs',
          grainMoistureInitial: '10',
          ppgInitial: '37',
        }),
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          grain_moisture_initial: 10,
          grain_moisture_current: 10,
          ppg_initial: 37,
          ppg_current: 37,
        }),
      )
    })

    it('maps all lowercase types to capitalized DB types', async () => {
      stubInsert({ error: null })

      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')

      const typeMap: Record<string, string> = {
        hop: 'Hops',
        grain: 'Grain',
        yeast: 'Yeast',
        adjunct: 'Adjunct',
        packaging: 'Packaging',
      }

      for (const [input, expected] of Object.entries(typeMap)) {
        vi.clearAllMocks()
        mockRequireActiveBrewery.mockResolvedValue({
          supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
          user: mockUser,
          brewery: mockBrewery,
        })
        stubInsert({ error: null })

        await addInventoryItem(
          makeFormData({ name: `Test ${input}`, itemType: input, currentStock: '1', unit: 'ea' }),
        )

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ item_type: expected }),
        )
      }
    })

    it('returns validation error for missing name', async () => {
      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')
      const result = await addInventoryItem(
        makeFormData({ name: '', itemType: 'hop', currentStock: '10', unit: 'lbs' }),
      )
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns error on database failure', async () => {
      stubInsert({ error: { message: 'DB error' } })

      const { addInventoryItem } = await import('@/app/(app)/inventory/actions')
      const result = await addInventoryItem(
        makeFormData({ name: 'Test', itemType: 'yeast', currentStock: '5', unit: 'packs' }),
      )

      expect(result.success).toBe(false)
    })
  })

  // ─── deleteInventoryItem ─────────────────────────────────────────
  describe('deleteInventoryItem', () => {
    it('deletes with brewery scoping', async () => {
      stubDeleteChain({ error: null })

      const { deleteInventoryItem } = await import('@/app/(app)/inventory/actions')
      const result = await deleteInventoryItem(makeFormData({ itemId: 'item-001' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('inventory')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/inventory')
    })

    it('returns error when itemId is missing', async () => {
      const { deleteInventoryItem } = await import('@/app/(app)/inventory/actions')
      const result = await deleteInventoryItem(makeFormData({}))
      expect(result.success).toBe(false)
      expect(result.error).toBe('Item ID is required')
    })
  })

  // ─── updateStock ─────────────────────────────────────────────────
  describe('updateStock', () => {
    it('updates stock and creates inventory_history entry', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // select current stock
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { current_stock: 50, name: 'Cascade', reorder_point: 10 },
                      error: null,
                    }),
                }),
              }),
            }),
          }
        }
        // update
        return {
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
        }
      })

      const { updateStock } = await import('@/app/(app)/inventory/actions')
      const result = await updateStock(makeFormData({ itemId: 'item-001', stock: '45' }))

      expect(result.success).toBe(true)
      expect(mockRecordInventoryChange).toHaveBeenCalledWith('item-001', 50, 45, 'stock_adjustment')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/inventory')
    })

    it('triggers reorder alert when stock falls below reorder_point', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { current_stock: 20, name: 'Pilsner', reorder_point: 10 },
                      error: null,
                    }),
                }),
              }),
            }),
          }
        }
        return {
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
        }
      })

      const { updateStock } = await import('@/app/(app)/inventory/actions')
      await updateStock(makeFormData({ itemId: 'item-001', stock: '5' }))

      expect(mockSendInventoryAlert).toHaveBeenCalledWith('brewery-001', 'Pilsner', 5)
    })

    it('returns error for invalid stock value', async () => {
      const { updateStock } = await import('@/app/(app)/inventory/actions')
      const result = await updateStock(makeFormData({ itemId: 'item-001', stock: 'abc' }))
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid stock amount')
    })
  })

  // ─── adjustInventoryStock ────────────────────────────────────────
  describe('adjustInventoryStock', () => {
    it('adjusts stock and creates history entry with reason', async () => {
      stubSelectThenUpdate(
        { data: { current_stock: 100, name: 'Citra', reorder_point: 20 }, error: null },
        { error: null },
      )

      const { adjustInventoryStock } = await import('@/app/(app)/inventory/actions')
      const result = await adjustInventoryStock('item-001', -15, 'Used in IPA batch')

      expect(result.success).toBe(true)
      expect(mockRecordInventoryChange).toHaveBeenCalledWith(
        'item-001',
        100,
        85,
        'stock_adjustment',
        'Used in IPA batch',
      )
    })

    it('floors stock at 0 for large negative adjustments', async () => {
      stubSelectThenUpdate(
        { data: { current_stock: 10, name: 'Yeast', reorder_point: 5 }, error: null },
        { error: null },
      )

      const { adjustInventoryStock } = await import('@/app/(app)/inventory/actions')
      const result = await adjustInventoryStock('item-001', -50)

      expect(result.success).toBe(true)
      // Stock should be floored at 0 (10 - 50 → 0)
      expect(mockRecordInventoryChange).toHaveBeenCalledWith(
        'item-001',
        10,
        0,
        'stock_adjustment',
        'Manual adjustment',
      )
    })

    it('triggers reorder alert when adjusted stock hits threshold', async () => {
      stubSelectThenUpdate(
        { data: { current_stock: 25, name: 'Hops', reorder_point: 20 }, error: null },
        { error: null },
      )

      const { adjustInventoryStock } = await import('@/app/(app)/inventory/actions')
      await adjustInventoryStock('item-001', -10)

      expect(mockSendInventoryAlert).toHaveBeenCalledWith('brewery-001', 'Hops', 15)
    })

    it('returns error when item not found', async () => {
      stubSelectThenUpdate(
        { data: null, error: { message: 'Not found' } },
      )

      const { adjustInventoryStock } = await import('@/app/(app)/inventory/actions')
      const result = await adjustInventoryStock('item-999', 10)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item not found')
    })
  })

  // ─── updateDegradationMetrics ────────────────────────────────────
  describe('updateDegradationMetrics', () => {
    it('creates degradation_log audit entry and updates item', async () => {
      const existingItem = {
        id: 'item-001',
        brewery_id: 'brewery-001',
        item_type: 'Hops',
        hsi_current: 95,
        grain_moisture_current: null,
        ppg_current: null,
        ppg_initial: null,
        storage_condition: 'cool_dry',
        received_date: '2026-01-01',
      }

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // select existing item
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: existingItem, error: null }),
                }),
              }),
            }),
          }
        }
        if (callCount === 2) {
          // insert degradation_log
          return {
            insert: () => Promise.resolve({ error: null }),
          }
        }
        // update inventory with new metrics
        return {
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
        }
      })

      const { updateDegradationMetrics } = await import('@/app/(app)/inventory/actions')
      const result = await updateDegradationMetrics('item-001', { hsi_current: 88 }, 'manual_input')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('degradation_logs')
      expect(mockFrom).toHaveBeenCalledWith('inventory')
    })

    it('generates alerts for critical HSI values', async () => {
      const existingItem = {
        id: 'item-001',
        brewery_id: 'brewery-001',
        item_type: 'Hops',
        name: 'Old Hops',
        hsi_current: 40,
        grain_moisture_current: null,
        ppg_current: null,
        ppg_initial: null,
        storage_condition: 'cool_dry',
        received_date: '2026-01-01',
      }

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: existingItem, error: null }),
                }),
              }),
            }),
          }
        }
        if (callCount === 2) {
          return { insert: () => Promise.resolve({ error: null }) }
        }
        return {
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
        }
      })

      const { updateDegradationMetrics } = await import('@/app/(app)/inventory/actions')
      // Updating HSI to critical level should trigger alert
      await updateDegradationMetrics('item-001', { hsi_current: 25 }, 'quality_test')

      // sendInventoryAlert should have been called because HSI < 30 is critical
      expect(mockSendInventoryAlert).toHaveBeenCalled()
    })
  })

  // ─── updateStorageCondition ──────────────────────────────────────
  describe('updateStorageCondition', () => {
    it('triggers degradation recalculation with new condition', async () => {
      const existingItem = {
        id: 'item-001',
        brewery_id: 'brewery-001',
        item_type: 'Hops',
        hsi_initial: 100,
        hsi_current: 95,
        grain_moisture_initial: null,
        grain_moisture_current: null,
        ppg_initial: null,
        ppg_current: null,
        received_date: '2026-01-01',
        storage_condition: 'cool_dry',
      }

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: existingItem, error: null }),
                }),
              }),
            }),
          }
        }
        if (callCount === 2) {
          return { insert: () => Promise.resolve({ error: null }) }
        }
        return {
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
        }
      })

      const { updateStorageCondition } = await import('@/app/(app)/inventory/actions')
      const result = await updateStorageCondition('item-001', 'warm')

      expect(result.success).toBe(true)
      // Should have inserted a degradation_log for the storage change
      expect(mockFrom).toHaveBeenCalledWith('degradation_logs')
    })
  })

  // ─── getDegradationHistory ───────────────────────────────────────
  describe('getDegradationHistory', () => {
    it('returns sorted degradation logs for an item', async () => {
      const mockLogs = [
        { id: 'log-1', hsi_before: 95, hsi_after: 90, created_at: '2026-04-02' },
        { id: 'log-2', hsi_before: 90, hsi_after: 85, created_at: '2026-04-01' },
      ]

      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockLogs, error: null }),
            }),
          }),
        }),
      })

      const { getDegradationHistory } = await import('@/app/(app)/inventory/actions')
      const result = await getDegradationHistory('item-001')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockFrom).toHaveBeenCalledWith('degradation_logs')
    })

    it('returns error when item ID is missing', async () => {
      const { getDegradationHistory } = await import('@/app/(app)/inventory/actions')
      const result = await getDegradationHistory('')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Item ID is required')
    })
  })

  // ─── recalculateAllDegradationMetrics ────────────────────────────
  describe('recalculateAllDegradationMetrics', () => {
    it('processes all tracked items and logs significant changes', async () => {
      const receivedDate = new Date()
      receivedDate.setDate(receivedDate.getDate() - 180) // 6 months ago

      const trackedItems = [
        {
          id: 'hop-1',
          brewery_id: 'brewery-001',
          hsi_initial: 100,
          hsi_current: 95, // Will recalculate lower after 6 months
          grain_moisture_initial: null,
          grain_moisture_current: null,
          ppg_initial: null,
          ppg_current: null,
          received_date: receivedDate.toISOString().split('T')[0],
          storage_condition: 'warm',
          degradation_tracked: true,
        },
      ]

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // select tracked items
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: trackedItems, error: null }),
              }),
            }),
          }
        }
        // insert degradation_log or update inventory
        return {
          insert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ error: null }) }),
        }
      })

      const { recalculateAllDegradationMetrics } = await import('@/app/(app)/inventory/actions')
      const result = await recalculateAllDegradationMetrics()

      expect(result.success).toBe(true)
    })

    it('returns success with empty inventory', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      })

      const { recalculateAllDegradationMetrics } = await import('@/app/(app)/inventory/actions')
      const result = await recalculateAllDegradationMetrics()

      expect(result.success).toBe(true)
    })
  })

  // ─── updateInventorySupplier ──────────────────────────────────
  describe('updateInventorySupplier', () => {
    it('updates supplier info and returns updated item', async () => {
      const updatedItem = { id: 'item-001', supplier_id: 'sup-001', supplier_name: 'HopCo' }
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
            }),
          }),
        }),
      })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { updateInventorySupplier } = await import('@/app/(app)/inventory/actions')
      const result = await updateInventorySupplier('item-001', 'sup-001', 'HopCo', 'info@hopco.com', 25.99)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedItem)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 'sup-001',
          supplier_name: 'HopCo',
          supplier_contact: 'info@hopco.com',
          purchase_price: 25.99,
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/inventory')
    })

    it('returns error when itemId is missing', async () => {
      const { updateInventorySupplier } = await import('@/app/(app)/inventory/actions')
      const result = await updateInventorySupplier('', 'sup-001', 'HopCo')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Item ID/i)
    })

    it('returns error when supplierId is missing', async () => {
      const { updateInventorySupplier } = await import('@/app/(app)/inventory/actions')
      const result = await updateInventorySupplier('item-001', '', 'HopCo')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Supplier ID/i)
    })

    it('handles DB errors gracefully', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        }),
      })

      const { updateInventorySupplier } = await import('@/app/(app)/inventory/actions')
      const result = await updateInventorySupplier('item-001', 'sup-001', 'HopCo')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Failed to update supplier/i)
    })

    it('handles auth failures', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('Not authenticated'))

      const { updateInventorySupplier } = await import('@/app/(app)/inventory/actions')
      const result = await updateInventorySupplier('item-001', 'sup-001', 'HopCo')

      expect(result.success).toBe(false)
    })
  })
})
