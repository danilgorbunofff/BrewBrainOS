// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockFrom,
  mockInsert,
  mockUpdate,
  mockEq,
  mockSelect,
  mockSingle,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
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

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function createInsertChain(result: { error: unknown } = { error: null }) {
  const chain = {
    insert: mockInsert.mockResolvedValue(result),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

function createUpdateChain(result: { error: unknown } = { error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    update: mockUpdate,
    eq: mockEq,
  }
  mockUpdate.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  // Make the chain resolve as the terminal result
  Object.assign(chain, result)
  mockFrom.mockReturnValue(chain)
  return chain
}

function createBatchLookupThenUpdateChain(
  batchResult: { data: unknown; error: unknown },
  updateResult: { error: unknown } = { error: null },
) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // First call: batch select
      const selectChain: Record<string, ReturnType<typeof vi.fn>> = {
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }
      mockSelect.mockReturnValue(selectChain)
      mockEq.mockReturnValue(selectChain)
      mockSingle.mockResolvedValue(batchResult)
      return selectChain
    }
    // Second call: tank update
    const updateChain: Record<string, ReturnType<typeof vi.fn>> = {
      update: mockUpdate,
      eq: mockEq,
    }
    mockUpdate.mockReturnValue(updateChain)
    mockEq.mockReturnValue(updateChain)
    Object.assign(updateChain, updateResult)
    return updateChain
  })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('tank/[id]/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase: { from: mockFrom },
      user: mockUser,
      brewery: mockBrewery,
    })
  })

  // ─── logSanitation ──────────────────────────────────────────────
  describe('logSanitation', () => {
    it('inserts with user_id and notes', async () => {
      createInsertChain({ error: null })

      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      const result = await logSanitation(
        makeFormData({ tankId: 'tank-001', notes: 'Deep clean with caustic' }),
      )

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('sanitation_logs')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tank_id: 'tank-001',
          user_id: 'user-001',
          notes: 'Deep clean with caustic',
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tank/tank-001')
    })

    it('defaults notes to "Routine cleaning" when empty', async () => {
      createInsertChain({ error: null })

      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      await logSanitation(makeFormData({ tankId: 'tank-001', notes: '' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Routine cleaning' }),
      )
    })

    it('defaults notes to "Routine cleaning" when not provided', async () => {
      createInsertChain({ error: null })

      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      await logSanitation(makeFormData({ tankId: 'tank-001' }))

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Routine cleaning' }),
      )
    })

    it('requires tankId', async () => {
      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      const result = await logSanitation(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Tank ID is required/)
    })

    it('returns error on DB failure', async () => {
      createInsertChain({ error: { message: 'insert failed' } })

      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      const result = await logSanitation(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Failed to log sanitation/)
    })

    it('returns error when not authenticated', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('Unauthorized'))

      const { logSanitation } = await import('@/app/(app)/tank/[id]/actions')
      const result = await logSanitation(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Unauthorized/)
    })
  })

  // ─── assignBatch ────────────────────────────────────────────────
  describe('assignBatch', () => {
    it('sets tank status to fermenting for fermenting batch', async () => {
      createBatchLookupThenUpdateChain(
        { data: { status: 'fermenting' }, error: null },
        { error: null },
      )

      const { assignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await assignBatch(
        makeFormData({ tankId: 'tank-001', batchId: 'batch-001' }),
      )

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_batch_id: 'batch-001',
          status: 'fermenting',
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tank/tank-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tanks')
    })

    it('sets tank status to conditioning for conditioning batch', async () => {
      createBatchLookupThenUpdateChain(
        { data: { status: 'conditioning' }, error: null },
        { error: null },
      )

      const { assignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await assignBatch(
        makeFormData({ tankId: 'tank-001', batchId: 'batch-002' }),
      )

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_batch_id: 'batch-002',
          status: 'conditioning',
        }),
      )
    })

    it('requires both tankId and batchId', async () => {
      const { assignBatch } = await import('@/app/(app)/tank/[id]/actions')

      const result1 = await assignBatch(makeFormData({ tankId: 'tank-001' }))
      expect(result1.success).toBe(false)
      expect(result1.error).toMatch(/Tank and Batch IDs are required/)

      const result2 = await assignBatch(makeFormData({ batchId: 'batch-001' }))
      expect(result2.success).toBe(false)
    })

    it('returns error when batch is not found', async () => {
      createBatchLookupThenUpdateChain(
        { data: null, error: { message: 'not found' } },
      )

      const { assignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await assignBatch(
        makeFormData({ tankId: 'tank-001', batchId: 'batch-999' }),
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Batch not found/)
    })

    it('returns error on DB update failure', async () => {
      createBatchLookupThenUpdateChain(
        { data: { status: 'fermenting' }, error: null },
        { error: { message: 'update failed' } },
      )

      const { assignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await assignBatch(
        makeFormData({ tankId: 'tank-001', batchId: 'batch-001' }),
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Failed to assign batch/)
    })
  })

  // ─── unassignBatch ──────────────────────────────────────────────
  describe('unassignBatch', () => {
    it('clears current_batch_id and sets status to ready', async () => {
      createUpdateChain({ error: null })

      const { unassignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await unassignBatch(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_batch_id: null,
          status: 'ready',
        }),
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tank/tank-001')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/tanks')
    })

    it('requires tankId', async () => {
      const { unassignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await unassignBatch(makeFormData({}))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Tank ID is required/)
    })

    it('returns error on DB failure', async () => {
      createUpdateChain({ error: { message: 'RLS violation' } })

      const { unassignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await unassignBatch(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Failed to unassign/)
    })

    it('returns error when not authenticated', async () => {
      mockRequireActiveBrewery.mockRejectedValue(new Error('Unauthorized'))

      const { unassignBatch } = await import('@/app/(app)/tank/[id]/actions')
      const result = await unassignBatch(makeFormData({ tankId: 'tank-001' }))

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Unauthorized/)
    })
  })
})
