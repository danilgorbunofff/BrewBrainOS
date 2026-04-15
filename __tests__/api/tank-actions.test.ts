// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockFrom,
  mockInsert,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

// ─── Helpers ────────────────────────────────────────────────────────
const mockBrewery = { id: 'brewery-001', name: 'Test Brewery' }
const mockUser = { id: 'user-001' }

function stubInsert(result: { error: unknown } = { error: null }) {
  mockInsert.mockResolvedValue(result)
  mockFrom.mockReturnValue({ insert: mockInsert })
}

function stubDeleteChain(
  logsResult: { error: unknown } = { error: null },
  tankResult: { error: unknown } = { error: null },
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // sanitation_logs delete
      return { delete: () => ({ eq: () => logsResult }) }
    }
    // tank delete
    return { delete: () => ({ eq: () => ({ eq: () => tankResult }) }) }
  })
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('tanks/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase: { from: mockFrom },
      user: mockUser,
      brewery: mockBrewery,
    })
  })

  // ─── addTank ────────────────────────────────────────────────────
  describe('addTank', () => {
    it('validates via tankSchema and inserts with brewery_id', async () => {
      stubInsert({ error: null })

      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'FV-1', capacity: '10' }))

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('tanks')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FV-1',
          capacity: 10,
          brewery_id: 'brewery-001',
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tanks')
    })

    it('accepts client-provided UUID as optimistic id', async () => {
      stubInsert({ error: null })

      const { addTank } = await import('@/app/(app)/tanks/actions')
      const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
      const result = await addTank(makeFormData({ id: uuid, name: 'FV-2' }))

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: uuid }),
      )
    })

    it('rejects empty name', async () => {
      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: '' }))

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('rejects name longer than 50 characters', async () => {
      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'A'.repeat(51) }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/too long/i)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('rejects negative capacity', async () => {
      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'FV-3', capacity: '-5' }))

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('requires active brewery', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('No brewery found'))

      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'FV-4' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/No brewery found/)
    })

    it('returns error on DB failure without leaking details', async () => {
      stubInsert({ error: { message: 'duplicate key violation', code: '23505' } })

      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'FV-5', capacity: '10' }))

      expect(result.success).toBe(false)
      expect(result.error).not.toMatch(/duplicate key/)
      expect(result.error).toMatch(/Database error/)
    })

    it('inserts without capacity when not provided', async () => {
      stubInsert({ error: null })

      const { addTank } = await import('@/app/(app)/tanks/actions')
      const result = await addTank(makeFormData({ name: 'FV-6' }))

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'FV-6', brewery_id: 'brewery-001' }),
      )
    })
  })

  // ─── deleteTank ─────────────────────────────────────────────────
  describe('deleteTank', () => {
    it('deletes sanitation logs first then tank with brewery scoping', async () => {
      stubDeleteChain({ error: null }, { error: null })

      const { deleteTank } = await import('@/app/(app)/tanks/actions')
      const result = await deleteTank(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tanks')
    })

    it('requires valid tankId', async () => {
      const { deleteTank } = await import('@/app/(app)/tanks/actions')
      const result = await deleteTank(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Tank ID is required/)
    })

    it('requires active brewery', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('Unauthorized'))

      const { deleteTank } = await import('@/app/(app)/tanks/actions')
      const result = await deleteTank(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Unauthorized/)
    })

    it('returns error when sanitation log deletion fails', async () => {
      stubDeleteChain({ error: { message: 'RLS violation' } })

      const { deleteTank } = await import('@/app/(app)/tanks/actions')
      const result = await deleteTank(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/cleaning logs/)
    })
  })
})
