// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockLogManualReading } = vi.hoisted(() => ({
  mockLogManualReading: vi.fn(),
}))

vi.mock('@/app/(app)/batches/[id]/actions', () => ({
  logManualReading: mockLogManualReading,
}))

// Passthrough Sentry wrapper
vi.mock('@/lib/with-sentry', () => ({
  withSentry: (handler: Function) => handler,
}))

// ─── Helpers ────────────────────────────────────────────────────────

function makeRequest(entries: Record<string, string>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return new Request('http://localhost/api/sync-manual-reading', {
    method: 'POST',
    body: fd,
  })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('POST /api/sync-manual-reading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns success response when reading syncs successfully', async () => {
    mockLogManualReading.mockResolvedValue({ success: true, data: null })

    const { POST } = await import('../../src/app/api/sync-manual-reading/route')
    const req = makeRequest({ batchId: 'b-001', gravity: '1.050', external_id: 'ext-001' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(res.status).toBe(200)
  })

  it('returns failure response when logManualReading fails', async () => {
    mockLogManualReading.mockResolvedValue({ success: false, error: 'Batch ID is required' })

    const { POST } = await import('../../src/app/api/sync-manual-reading/route')
    const req = makeRequest({})
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('handles duplicate external_id idempotently (logManualReading returns success)', async () => {
    // logManualReading already handles dedup — returns success for duplicate external_id
    mockLogManualReading.mockResolvedValue({ success: true, data: null })

    const { POST } = await import('../../src/app/api/sync-manual-reading/route')
    const req = makeRequest({ batchId: 'b-001', external_id: 'dup-001', gravity: '1.045' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(true)
  })

  it('delegates formData to logManualReading', async () => {
    mockLogManualReading.mockResolvedValue({ success: true, data: null })

    const { POST } = await import('../../src/app/api/sync-manual-reading/route')
    const req = makeRequest({ batchId: 'b-001', gravity: '1.048', temperature: '20.5' })
    await POST(req)

    expect(mockLogManualReading).toHaveBeenCalledTimes(1)
    const fd = mockLogManualReading.mock.calls[0][0] as FormData
    expect(fd.get('batchId')).toBe('b-001')
    expect(fd.get('gravity')).toBe('1.048')
    expect(fd.get('temperature')).toBe('20.5')
  })
})
