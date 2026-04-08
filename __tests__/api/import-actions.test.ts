import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { createClientMock, getActiveBreweryMock, insertMock, revalidatePathMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getActiveBreweryMock: vi.fn(),
  insertMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/active-brewery', () => ({
  getActiveBrewery: getActiveBreweryMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }

function stubSupabase() {
  insertMock.mockResolvedValue({ error: null })
  createClientMock.mockResolvedValue({
    from: () => ({ insert: insertMock }),
  })
}

describe('import-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getActiveBreweryMock.mockResolvedValue(mockBrewery)
    stubSupabase()
  })

  // ─── importTanks ────────────────────────────────────────────────────
  describe('importTanks', () => {
    it('inserts valid tank rows with correct statuses', async () => {
      const { importTanks } = await import('@/app/actions/import-actions')
      const data = [
        { name: 'FV-1', capacity: '10', status: 'ready' },
        { name: 'BT-1', capacity: '20', status: 'fermenting' },
      ]
      const result = await importTanks(data)
      expect(result).toEqual({ success: true, count: 2 })
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ brewery_id: 'brewery-001', name: 'FV-1', capacity: 10, status: 'ready' }),
          expect.objectContaining({ brewery_id: 'brewery-001', name: 'BT-1', capacity: 20, status: 'fermenting' }),
        ]),
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/tanks')
    })

    it('defaults invalid status to ready', async () => {
      const { importTanks } = await import('@/app/actions/import-actions')
      const data = [{ name: 'FV-X', capacity: '5', status: 'bogus' }]
      const result = await importTanks(data)
      expect(result).toEqual({ success: true, count: 1 })
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'ready' }),
      ])
    })

    it('returns error when no valid rows', async () => {
      const { importTanks } = await import('@/app/actions/import-actions')
      const data = [{ name: '', capacity: 'abc' }]
      const result = await importTanks(data)
      expect(result.success).toBe(false)
      expect(result.error).toBe('No valid rows found')
    })

    it('returns error when no active brewery', async () => {
      getActiveBreweryMock.mockResolvedValue(null)
      const { importTanks } = await import('@/app/actions/import-actions')
      const result = await importTanks([{ name: 'FV', capacity: '10', status: 'ready' }])
      expect(result).toEqual({ success: false, error: 'No active brewery' })
    })
  })

  // ─── importInventory ────────────────────────────────────────────────
  describe('importInventory', () => {
    it('inserts rows with core and optional fields', async () => {
      const { importInventory } = await import('@/app/actions/import-actions')
      const data = [
        {
          item_type: 'hops', name: 'Citra', current_stock: '22.5', unit: 'lbs',
          reorder_point: '5', lot_number: 'LOT-001', manufacturer: 'YCH',
          received_date: '2026-03-01', storage_condition: 'cool_dry',
          degradation_tracked: 'true', hsi_initial: '95',
        },
      ]
      const result = await importInventory(data)
      expect(result).toEqual({ success: true, count: 1 })
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          brewery_id: 'brewery-001',
          item_type: 'Hops',
          name: 'Citra',
          current_stock: 22.5,
          unit: 'lbs',
          reorder_point: 5,
          hsi_initial: 95,
          degradation_tracked: true,
          storage_condition: 'cool_dry',
          received_date: '2026-03-01',
        }),
      ])
    })

    it('normalizes item_type case-insensitively and supports Packaging', async () => {
      const { importInventory } = await import('@/app/actions/import-actions')
      const data = [
        { item_type: 'PACKAGING', name: '16oz Cans', current_stock: '500', unit: 'ea' },
        { item_type: 'grain', name: 'Pilsner', current_stock: '300', unit: 'lbs' },
      ]
      const result = await importInventory(data)
      expect(result).toEqual({ success: true, count: 2 })
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ item_type: 'Packaging' }),
          expect.objectContaining({ item_type: 'Grain' }),
        ]),
      )
    })

    it('defaults unknown item_type to Adjunct', async () => {
      const { importInventory } = await import('@/app/actions/import-actions')
      const data = [{ item_type: 'unknown', name: 'Mystery', current_stock: '1', unit: 'ea' }]
      const result = await importInventory(data)
      expect(result).toEqual({ success: true, count: 1 })
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ item_type: 'Adjunct' }),
      ])
    })
  })

  // ─── importBatches ──────────────────────────────────────────────────
  describe('importBatches', () => {
    it('inserts valid batch rows', async () => {
      const { importBatches } = await import('@/app/actions/import-actions')
      const data = [
        { recipe_name: 'Hazy IPA', status: 'fermenting', og: '1.065', fg: '1.012', target_temp: '67' },
        { recipe_name: 'Kölsch', status: 'complete', og: '1.048', fg: '1.008' },
      ]
      const result = await importBatches(data)
      expect(result).toEqual({ success: true, count: 2 })
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ recipe_name: 'Hazy IPA', status: 'fermenting', og: 1.065 }),
          expect.objectContaining({ recipe_name: 'Kölsch', status: 'complete', og: 1.048 }),
        ]),
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/batches')
    })

    it('defaults invalid status to brewing', async () => {
      const { importBatches } = await import('@/app/actions/import-actions')
      const data = [{ recipe_name: 'Test', status: 'invalid' }]
      const result = await importBatches(data)
      expect(result).toEqual({ success: true, count: 1 })
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'brewing' }),
      ])
    })
  })

  // ─── importSuppliers ────────────────────────────────────────────────
  describe('importSuppliers', () => {
    it('inserts valid supplier rows', async () => {
      const { importSuppliers } = await import('@/app/actions/import-actions')
      const data = [
        { name: 'YCH Hops', country: 'US', supplier_type: 'Distributor', email: 'jane@ychhops.com' },
        { name: 'Fermentis', country: 'FR', supplier_type: 'Direct', specialty: 'Yeast' },
      ]
      const result = await importSuppliers(data)
      expect(result).toEqual({ success: true, count: 2 })
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'YCH Hops', country: 'US', supplier_type: 'Distributor' }),
          expect.objectContaining({ name: 'Fermentis', country: 'FR', specialty: 'Yeast' }),
        ]),
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/suppliers')
    })

    it('skips rows missing required fields', async () => {
      const { importSuppliers } = await import('@/app/actions/import-actions')
      const data = [{ name: '', country: '', supplier_type: '' }]
      const result = await importSuppliers(data)
      expect(result.success).toBe(false)
      expect(result.error).toBe('No valid rows found')
    })
  })

  // ─── importRecipes ─────────────────────────────────────────────────
  describe('importRecipes', () => {
    it('inserts valid recipe rows', async () => {
      const { importRecipes } = await import('@/app/actions/import-actions')
      const data = [
        { name: 'Hazy IPA', batch_size_bbls: '7', style: 'IPA', target_og: '1.065', target_ibu: '45' },
        { name: 'Kölsch', batch_size_bbls: '7', target_abv: '5.2' },
      ]
      const result = await importRecipes(data)
      expect(result).toEqual({ success: true, count: 2 })
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Hazy IPA', batch_size_bbls: 7, target_ibu: 45 }),
          expect.objectContaining({ name: 'Kölsch', batch_size_bbls: 7, target_abv: 5.2 }),
        ]),
      )
      expect(revalidatePathMock).toHaveBeenCalledWith('/recipes')
    })

    it('skips rows with missing batch_size_bbls', async () => {
      const { importRecipes } = await import('@/app/actions/import-actions')
      const data = [{ name: 'Missing Size' }]
      const result = await importRecipes(data)
      expect(result.success).toBe(false)
    })
  })
})
