// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockRedirect,
  mockFrom,
  mockInsert,
  mockSelect,
  mockSingle,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRedirect: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function stubInsertSelectSingle(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockFrom.mockReturnValue({ insert: mockInsert })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('batches/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase: { from: mockFrom },
      user: mockUser,
      brewery: mockBrewery,
    })
  })

  // ─── addBatch ────────────────────────────────────────────────────
  describe('addBatch', () => {
    it('creates batch with brewery_id and default status fermenting', async () => {
      const batch = { id: 'b-001', recipe_name: 'Test IPA', status: 'fermenting', og: 1.065, fg: null, created_at: new Date().toISOString() }
      stubInsertSelectSingle(batch)

      const { addBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await addBatch(makeFormData({ recipeName: 'Test IPA', og: '1.065' }))

      expect(result.success).toBe(true)
      expect(result.data).toEqual(batch)
      expect(mockFrom).toHaveBeenCalledWith('batches')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          brewery_id: 'brewery-001',
          recipe_name: 'Test IPA',
          status: 'fermenting',
          og: 1.065,
          fg: null,
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches')
    })

    it('rejects empty recipe name', async () => {
      const { addBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await addBatch(makeFormData({ recipeName: '   ', og: '1.050' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Recipe name/i)
    })

    it('handles optional OG — null when empty, parsed when numeric', async () => {
      const batch = { id: 'b-002', recipe_name: 'Stout', status: 'fermenting', og: null, fg: null, created_at: new Date().toISOString() }
      stubInsertSelectSingle(batch)

      const { addBatch } = await import('../../src/app/(app)/batches/actions')
      await addBatch(makeFormData({ recipeName: 'Stout', og: '' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ og: null }),
      )
    })

    it('accepts optional client-side UUID', async () => {
      const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
      const batch = { id: uuid, recipe_name: 'Pale Ale', status: 'fermenting', og: null, fg: null, created_at: new Date().toISOString() }
      stubInsertSelectSingle(batch)

      const { addBatch } = await import('../../src/app/(app)/batches/actions')
      await addBatch(makeFormData({ id: uuid, recipeName: 'Pale Ale' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: uuid }),
      )
    })

    it('returns error on database failure', async () => {
      stubInsertSelectSingle(null, { message: 'DB error', code: '42000' })

      const { addBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await addBatch(makeFormData({ recipeName: 'Failed Batch' }))

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  // ─── deleteBatch ────────────────────────────────────────────────
  describe('deleteBatch', () => {
    function stubDeleteChain(
      tankUpdateResult: { error: unknown } = { error: null },
      batchDeleteResult: { error: unknown } = { error: null },
    ) {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // tanks update (clear current_batch_id)
          return {
            update: () => ({
              eq: () => ({
                eq: () => tankUpdateResult,
              }),
            }),
          }
        }
        // batches delete
        return {
          delete: () => ({
            eq: () => ({
              eq: () => batchDeleteResult,
            }),
          }),
        }
      })
    }

    it('clears tanks referencing the batch and then deletes', async () => {
      stubDeleteChain()

      const { deleteBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await deleteBatch(makeFormData({ batchId: 'b-001' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('tanks')
      expect(mockFrom).toHaveBeenCalledWith('batches')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches')
    })

    it('requires batchId', async () => {
      const { deleteBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await deleteBatch(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch ID/i)
    })

    it('returns error on database failure', async () => {
      stubDeleteChain({ error: null }, { error: { message: 'FK violation' } })

      const { deleteBatch } = await import('../../src/app/(app)/batches/actions')
      const result = await deleteBatch(makeFormData({ batchId: 'b-fail' }))

      expect(result.success).toBe(false)
    })

    it('redirects when redirectTo is provided', async () => {
      stubDeleteChain()
      // Simulate Next.js redirect behavior — throws an error with NEXT_REDIRECT digest
      const redirectError = new Error('NEXT_REDIRECT')
      Object.assign(redirectError, { digest: 'NEXT_REDIRECT:/batches' })
      mockRedirect.mockImplementation(() => { throw redirectError })

      const { deleteBatch } = await import('../../src/app/(app)/batches/actions')

      await expect(
        deleteBatch(makeFormData({ batchId: 'b-001', redirectTo: '/batches' })),
      ).rejects.toThrow()

      expect(mockRedirect).toHaveBeenCalledWith('/batches')
    })
  })
})
