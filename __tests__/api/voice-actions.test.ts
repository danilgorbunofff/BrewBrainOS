// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockRequireActiveBrewery,
  mockRevalidatePath,
  mockFrom,
  mockInsert,
  mockSelect,
  mockSingle,
  mockUpdate,
  mockEq,
  mockIlike,
  mockLimit,
} = vi.hoisted(() => ({
  mockRequireActiveBrewery: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockIlike: vi.fn(),
  mockLimit: vi.fn(),
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: mockRequireActiveBrewery,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([
    ['x-forwarded-for', '127.0.0.1'],
    ['user-agent', 'test-agent'],
  ])),
}))

// Mock Gemini to avoid real API calls
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}))

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

vi.mock('@/lib/utils', () => ({
  sanitizeDbError: (err: unknown) => err instanceof Error ? err.message : String(err),
  isUniqueViolationFor: (err: { code?: string; message?: string }, col: string) =>
    err?.code === '23505' && (err?.message?.includes(col) ?? false),
}))

// ─── Constants ──────────────────────────────────────────────────────

const mockUser = { id: 'user-001', email: 'brewer@test.com' }
const mockBreweryProduction = { id: 'brewery-001', name: 'TestBrew', subscription_tier: 'production' }
const mockBreweryFree = { id: 'brewery-002', name: 'FreeBrew', subscription_tier: 'free' }

function makeGeminiResponse(data: Record<string, unknown>) {
  return {
    response: {
      text: () => JSON.stringify(data),
    },
  }
}

function makeAudioFile(): File {
  return new File(['fake-audio-data'], 'voice-log.webm', { type: 'audio/webm' })
}

function makeFormData(overrides: Record<string, string | Blob> = {}): FormData {
  const fd = new FormData()
  fd.set('audio', makeAudioFile())
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

function stubSupabase() {
  const supabase = { from: mockFrom }

  // Default chain: from → select → eq → eq → single
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })

  mockSelect.mockReturnValue({
    eq: mockEq,
    ilike: mockIlike,
  })

  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, limit: mockLimit })
  mockIlike.mockReturnValue({ limit: mockLimit })
  mockLimit.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({ data: null, error: null })

  return supabase
}

// ─── processVoiceLog Tests ──────────────────────────────────────────

describe('processVoiceLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('rejects free-tier users', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryFree,
    })

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const result = await processVoiceLog(makeFormData())

    expect(result.success).toBe(false)
    expect(result.error).toContain('Production')
  })

  it('rejects when no audio is provided', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const fd = new FormData()
    const result = await processVoiceLog(fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No audio')
  })

  it('rejects unsupported audio format', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const fd = new FormData()
    fd.set('audio', new File(['data'], 'voice.txt', { type: 'text/plain' }))
    const result = await processVoiceLog(fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported audio')
  })

  it('rejects audio that exceeds max size', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    // Create a File-like object that reports > 10MB
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'voice.webm', { type: 'audio/webm' })
    const fd = new FormData()
    fd.set('audio', bigFile)
    const result = await processVoiceLog(fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('returns error when batch cannot be resolved', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    mockGenerateContent.mockResolvedValue(
      makeGeminiResponse({ temperature: 68, gravity: 1.05, batch_id: null, notes: 'Looks good' })
    )

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const result = await processVoiceLog(makeFormData())

    expect(result.success).toBe(false)
    expect(result.error).toContain('Could not link reading')
    expect(result.data).toBeDefined()
  })

  it('returns error when Gemini returns unparseable output', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not valid json at all' },
    })

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const result = await processVoiceLog(makeFormData())

    expect(result.success).toBe(false)
    expect(result.error).toContain('AI failed')
  })

  it('returns Unauthorized when requireActiveBrewery throws', async () => {
    mockRequireActiveBrewery.mockRejectedValue(new Error('Unauthorized'))

    const { processVoiceLog } = await import('../../src/app/actions/voice')
    const result = await processVoiceLog(makeFormData())

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })
})

// ─── transcribeVoiceLog Tests ───────────────────────────────────────

describe('transcribeVoiceLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('rejects free-tier users', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryFree,
    })

    const { transcribeVoiceLog } = await import('../../src/app/actions/voiceModal')
    const result = await transcribeVoiceLog(makeFormData())

    expect(result.success).toBe(false)
    expect(result.error).toContain('Production')
  })

  it('returns extracted data for production-tier users', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    mockGenerateContent.mockResolvedValue(
      makeGeminiResponse({
        transcript: 'Gravity is 1.012, temp 68',
        temperature: 68,
        gravity: 1.012,
        batch_id: null,
        notes: 'Looking clear',
      })
    )

    const { transcribeVoiceLog } = await import('../../src/app/actions/voiceModal')
    const result = await transcribeVoiceLog(makeFormData())

    expect(result.success).toBe(true)
    expect(result.data?.temperature).toBe(68)
    expect(result.data?.gravity).toBe(1.012)
    expect(result.data?.transcript).toBe('Gravity is 1.012, temp 68')
  })
})

// ─── saveVoiceLog Tests ─────────────────────────────────────────────

describe('saveVoiceLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('rejects free-tier users', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryFree,
    })

    const { saveVoiceLog } = await import('../../src/app/actions/voiceModal')
    const result = await saveVoiceLog({
      temperature: 68,
      gravity: 1.05,
      notes: 'Test',
      batch_id: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Production')
  })

  it('returns error when batch cannot be resolved', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    const { saveVoiceLog } = await import('../../src/app/actions/voiceModal')
    const result = await saveVoiceLog({
      temperature: 68,
      gravity: 1.05,
      notes: 'Test',
      batch_id: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Could not link reading')
  })

  it('accepts external_id for deduplication', async () => {
    const supabase = stubSupabase()
    mockRequireActiveBrewery.mockResolvedValue({
      supabase,
      user: mockUser,
      brewery: mockBreweryProduction,
    })

    // Stub tank lookup to return a batch
    mockSingle.mockResolvedValue({
      data: { current_batch_id: 'batch-001' },
      error: null,
    })

    const { saveVoiceLog } = await import('../../src/app/actions/voiceModal')
    const result = await saveVoiceLog({
      temperature: 68,
      gravity: 1.05,
      notes: 'Test',
      batch_id: null,
      tankId: 'tank-001',
      external_id: 'ext-123',
    })

    expect(result.success).toBe(true)
  })
})
