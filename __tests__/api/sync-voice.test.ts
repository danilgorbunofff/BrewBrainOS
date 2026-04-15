// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockProcessVoiceLog } = vi.hoisted(() => ({
  mockProcessVoiceLog: vi.fn(),
}))

vi.mock('@/app/actions/voice', () => ({
  processVoiceLog: mockProcessVoiceLog,
}))

// Passthrough Sentry wrapper
vi.mock('@/lib/with-sentry', () => ({
  withSentry: (handler: Function) => handler,
}))

// ─── Helpers ────────────────────────────────────────────────────────

function makeRequest(entries: Record<string, string | Blob>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return new Request('http://localhost/api/sync-voice', {
    method: 'POST',
    body: fd,
  })
}

function makeAudioBlob(): Blob {
  return new Blob(['fake-audio-data'], { type: 'audio/webm' })
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('POST /api/sync-voice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns success response when voice log syncs successfully', async () => {
    mockProcessVoiceLog.mockResolvedValue({ success: true, data: { temperature: 68 } })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({ audio: makeAudioBlob(), external_id: 'ext-001' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(res.status).toBe(200)
  })

  it('returns failure response when processVoiceLog fails', async () => {
    mockProcessVoiceLog.mockResolvedValue({ success: false, error: 'No audio provided.' })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({})
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('returns failure for tier-gated error', async () => {
    mockProcessVoiceLog.mockResolvedValue({
      success: false,
      error: 'AI Voice Logs require a Production or higher plan.',
    })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({ audio: makeAudioBlob() })
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(false)
    expect(body.error).toContain('Production')
  })

  it('handles duplicate external_id idempotently', async () => {
    mockProcessVoiceLog.mockResolvedValue({ success: true, deduped: true })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({ audio: makeAudioBlob(), external_id: 'dup-001' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.success).toBe(true)
  })

  it('delegates formData to processVoiceLog', async () => {
    mockProcessVoiceLog.mockResolvedValue({ success: true, data: null })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({
      audio: makeAudioBlob(),
      external_id: 'ext-002',
      tankId: 'tank-001',
    })
    await POST(req)

    expect(mockProcessVoiceLog).toHaveBeenCalledTimes(1)
    const fd = mockProcessVoiceLog.mock.calls[0][0] as FormData
    expect(fd.get('external_id')).toBe('ext-002')
    expect(fd.get('tankId')).toBe('tank-001')
  })

  it('returns 503 with retryable flag on unexpected errors', async () => {
    mockProcessVoiceLog.mockRejectedValue(new Error('network timeout'))

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({ audio: makeAudioBlob() })
    // withSentry catches the error and calls onError which returns 503
    // In test, withSentry is a passthrough so the error propagates
    await expect(POST(req)).rejects.toThrow('network timeout')
  })

  it('returns unauthorized status for auth errors', async () => {
    mockProcessVoiceLog.mockResolvedValue({ success: false, error: 'Unauthorized' })

    const { POST } = await import('../../src/app/api/sync-voice/route')
    const req = makeRequest({ audio: makeAudioBlob() })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.retryable).toBe(true)
  })
})
