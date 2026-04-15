// @vitest-environment jsdom

/**
 * Dashboard KPI computation tests
 *
 * Validates that the dashboard correctly computes:
 * - Active batch count (fermenting + conditioning)
 * - Tank utilisation
 * - Low stock count (current_stock <= reorder_point)
 * - Edge cases with 0 items, null reorder_point, etc.
 */

import { describe, expect, it } from 'vitest'

// ─── Extracted KPI logic (mirrors DashboardContent computation) ─────
interface Batch {
  id: string
  recipe_name: string
  status: string
  created_at: string
  og: number | null
  fg: number | null
}

interface Tank {
  id: string
  name: string
  status: string
  current_batch_id: string | null
}

interface InventoryItem {
  id: string
  name: string
  current_stock: number
  reorder_point: number | null
  unit: string
  item_type: string
}

function computeDashboardStats(
  batches: Batch[],
  tanks: Tank[],
  inventory: InventoryItem[],
) {
  return {
    activeBatches: batches.filter(
      (b) => b.status === 'fermenting' || b.status === 'conditioning',
    ).length,
    fermenting: batches.filter((b) => b.status === 'fermenting').length,
    conditioning: batches.filter((b) => b.status === 'conditioning').length,
    totalTanks: tanks.length,
    tanksInUse: tanks.filter(
      (t) => t.current_batch_id || t.status === 'fermenting',
    ).length,
    lowStockItems: inventory.filter(
      (i) => i.current_stock <= (i.reorder_point || 0),
    ).length,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('Dashboard KPI computations', () => {
  describe('activeBatches', () => {
    it('counts fermenting and conditioning batches', () => {
      const batches: Batch[] = [
        { id: '1', recipe_name: 'IPA', status: 'fermenting', created_at: '', og: null, fg: null },
        { id: '2', recipe_name: 'Stout', status: 'conditioning', created_at: '', og: null, fg: null },
        { id: '3', recipe_name: 'Lager', status: 'complete', created_at: '', og: null, fg: null },
        { id: '4', recipe_name: 'Pale Ale', status: 'packaging', created_at: '', og: null, fg: null },
        { id: '5', recipe_name: 'Amber', status: 'brewing', created_at: '', og: null, fg: null },
      ]
      const stats = computeDashboardStats(batches, [], [])
      expect(stats.activeBatches).toBe(2)
      expect(stats.fermenting).toBe(1)
      expect(stats.conditioning).toBe(1)
    })

    it('returns 0 when no batches exist', () => {
      const stats = computeDashboardStats([], [], [])
      expect(stats.activeBatches).toBe(0)
      expect(stats.fermenting).toBe(0)
      expect(stats.conditioning).toBe(0)
    })
  })

  describe('tanks', () => {
    it('counts total tanks', () => {
      const tanks: Tank[] = [
        { id: '1', name: 'FV-1', status: 'available', current_batch_id: null },
        { id: '2', name: 'FV-2', status: 'fermenting', current_batch_id: 'batch-1' },
      ]
      const stats = computeDashboardStats([], tanks, [])
      expect(stats.totalTanks).toBe(2)
    })

    it('counts tanks in use (have current_batch_id or are fermenting)', () => {
      const tanks: Tank[] = [
        { id: '1', name: 'FV-1', status: 'available', current_batch_id: null },
        { id: '2', name: 'FV-2', status: 'fermenting', current_batch_id: null },
        { id: '3', name: 'FV-3', status: 'available', current_batch_id: 'batch-1' },
        { id: '4', name: 'FV-4', status: 'fermenting', current_batch_id: 'batch-2' },
      ]
      const stats = computeDashboardStats([], tanks, [])
      expect(stats.tanksInUse).toBe(3) // #2, #3, #4
    })

    it('returns 0 when no tanks exist', () => {
      const stats = computeDashboardStats([], [], [])
      expect(stats.totalTanks).toBe(0)
      expect(stats.tanksInUse).toBe(0)
    })
  })

  describe('lowStockItems', () => {
    it('counts items where current_stock <= reorder_point', () => {
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Cascade Hops', current_stock: 5, reorder_point: 10, unit: 'lbs', item_type: 'hops' },
        { id: '2', name: 'Pale Malt', current_stock: 100, reorder_point: 50, unit: 'lbs', item_type: 'grain' },
        { id: '3', name: 'US-05 Yeast', current_stock: 2, reorder_point: 5, unit: 'packs', item_type: 'yeast' },
      ]
      const stats = computeDashboardStats([], [], inventory)
      expect(stats.lowStockItems).toBe(2) // Cascade + US-05
    })

    it('counts items at exactly the reorder point', () => {
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Cascade Hops', current_stock: 10, reorder_point: 10, unit: 'lbs', item_type: 'hops' },
      ]
      const stats = computeDashboardStats([], [], inventory)
      expect(stats.lowStockItems).toBe(1)
    })

    it('treats null reorder_point as 0 (only zero or negative stock triggers)', () => {
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Misc Item', current_stock: 5, reorder_point: null, unit: 'units', item_type: 'other' },
        { id: '2', name: 'Out of Stock', current_stock: 0, reorder_point: null, unit: 'units', item_type: 'other' },
      ]
      const stats = computeDashboardStats([], [], inventory)
      // current_stock 5 <= (null || 0) → 5 <= 0 → false
      // current_stock 0 <= (null || 0) → 0 <= 0 → true
      expect(stats.lowStockItems).toBe(1)
    })

    it('handles 0 inventory items gracefully', () => {
      const stats = computeDashboardStats([], [], [])
      expect(stats.lowStockItems).toBe(0)
    })

    it('does not count items with stock above reorder point', () => {
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Cascade', current_stock: 50, reorder_point: 10, unit: 'lbs', item_type: 'hops' },
        { id: '2', name: 'Pale Malt', current_stock: 200, reorder_point: 100, unit: 'lbs', item_type: 'grain' },
      ]
      const stats = computeDashboardStats([], [], inventory)
      expect(stats.lowStockItems).toBe(0)
    })

    it('treats reorder_point of 0 correctly', () => {
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Non-reorder Item', current_stock: 5, reorder_point: 0, unit: 'units', item_type: 'other' },
        { id: '2', name: 'Zero Stock', current_stock: 0, reorder_point: 0, unit: 'units', item_type: 'other' },
      ]
      const stats = computeDashboardStats([], [], inventory)
      // 5 <= 0 → false, 0 <= 0 → true
      expect(stats.lowStockItems).toBe(1)
    })
  })

  describe('combined', () => {
    it('computes all stats correctly with mixed data', () => {
      const batches: Batch[] = [
        { id: '1', recipe_name: 'IPA', status: 'fermenting', created_at: '', og: 1.065, fg: null },
        { id: '2', recipe_name: 'Stout', status: 'fermenting', created_at: '', og: 1.072, fg: null },
        { id: '3', recipe_name: 'Lager', status: 'conditioning', created_at: '', og: 1.048, fg: 1.012 },
        { id: '4', recipe_name: 'Wheat', status: 'complete', created_at: '', og: 1.052, fg: 1.010 },
      ]
      const tanks: Tank[] = [
        { id: '1', name: 'FV-1', status: 'fermenting', current_batch_id: 'batch-1' },
        { id: '2', name: 'FV-2', status: 'fermenting', current_batch_id: 'batch-2' },
        { id: '3', name: 'BT-1', status: 'conditioning', current_batch_id: 'batch-3' },
        { id: '4', name: 'FV-3', status: 'available', current_batch_id: null },
      ]
      const inventory: InventoryItem[] = [
        { id: '1', name: 'Cascade', current_stock: 3, reorder_point: 10, unit: 'lbs', item_type: 'hops' },
        { id: '2', name: 'Pale Malt', current_stock: 200, reorder_point: 100, unit: 'lbs', item_type: 'grain' },
      ]

      const stats = computeDashboardStats(batches, tanks, inventory)

      expect(stats.activeBatches).toBe(3) // 2 fermenting + 1 conditioning
      expect(stats.fermenting).toBe(2)
      expect(stats.conditioning).toBe(1)
      expect(stats.totalTanks).toBe(4)
      expect(stats.tanksInUse).toBe(3) // #1, #2, #3 all have current_batch_id or fermenting status
      expect(stats.lowStockItems).toBe(1) // only Cascade
    })
  })
})
