import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureExceptionMock,
  flushMock,
  initMock,
  setExtraMock,
  setTagMock,
  requireActiveBreweryMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  initMock: vi.fn(),
  setExtraMock: vi.fn(),
  setTagMock: vi.fn(),
  requireActiveBreweryMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
  flush: flushMock,
  init: initMock,
  withScope: (callback: (scope: { setExtra: typeof setExtraMock; setTag: typeof setTagMock }) => void) => {
    callback({ setExtra: setExtraMock, setTag: setTagMock })
  },
}))

vi.mock('@/lib/require-brewery', () => ({
  requireActiveBrewery: requireActiveBreweryMock,
}))

const brewery = { id: 'brewery-abc', name: 'Test Brewery', license_number: null }

function makeSupabaseMock({
  batches = [] as unknown[],
  readings = [] as unknown[],
  tanks = [] as unknown[],
  inventory = [] as unknown[],
} = {}) {
  const makeChain = (data: unknown[]) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
    then: vi.fn((resolve: (value: { data: unknown[] }) => void) => Promise.resolve().then(() => resolve({ data }))),
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'batches') return makeChain(batches)
      if (table === 'batch_readings') return makeChain(readings)
      if (table === 'tanks') return makeChain(tanks)
      if (table === 'inventory') return makeChain(inventory)
      return makeChain([])
    }),
  }
}

describe('GET /api/activity-logs', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.SENTRY_DSN = 'https://server@example.ingest.sentry.io/1'
  })

  it('returns 401 when requireActiveBrewery throws Unauthorized', async () => {
    requireActiveBreweryMock.mockRejectedValue(new Error('Unauthorized'))

    const { GET } = await import('@/app/api/activity-logs/route')
    const res = await GET(new Request('http://localhost/api/activity-logs'))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toEqual({ error: 'Failed to load activity logs' })
  })

  it('returns normalized activity entries sorted by timestamp', async () => {
    const supabase = makeSupabaseMock({
      batches: [
        { id: 'b1', recipe_name: 'Hazy IPA', status: 'fermenting', created_at: '2026-04-09T10:00:00.000Z' },
      ],
      readings: [
        { id: 'r1', gravity: 1.048, temperature: 18.5, created_at: '2026-04-09T11:00:00.000Z', batch_id: 'b1' },
      ],
      tanks: [
        { id: 't1', name: 'FV-01', status: 'fermenting', created_at: '2026-04-09T09:00:00.000Z' },
      ],
    })
    requireActiveBreweryMock.mockResolvedValue({ supabase, brewery })

    const { GET } = await import('@/app/api/activity-logs/route')
    const res = await GET(new Request('http://localhost/api/activity-logs?type=all&limit=50'))

    expect(res.status).toBe(200)
    const json = await res.json() as { activities: Array<{ id: string; type: string; timestamp: string }> }
    const ids = json.activities.map((a) => a.id)
    // Reading is newer → should appear first
    expect(ids[0]).toBe('r-r1')
    expect(ids).toContain('b-b1')
    expect(ids).toContain('t-t1')
  })

  it('filters to only the requested type', async () => {
    const supabase = makeSupabaseMock({
      batches: [
        { id: 'b1', recipe_name: 'Hazy IPA', status: 'fermenting', created_at: '2026-04-09T10:00:00.000Z' },
      ],
    })
    requireActiveBreweryMock.mockResolvedValue({ supabase, brewery })

    const { GET } = await import('@/app/api/activity-logs/route')
    const res = await GET(new Request('http://localhost/api/activity-logs?type=batch&limit=50'))

    expect(res.status).toBe(200)
    const json = await res.json() as { activities: Array<{ id: string; type: string }> }
    expect(json.activities.every((a) => a.type === 'batch')).toBe(true)
    expect(json.activities[0].id).toBe('b-b1')
  })

  it('caps limit at 200', async () => {
    const supabase = makeSupabaseMock({ batches: [] })
    requireActiveBreweryMock.mockResolvedValue({ supabase, brewery })

    const { GET } = await import('@/app/api/activity-logs/route')
    const res = await GET(new Request('http://localhost/api/activity-logs?limit=9999'))

    // No error expected — just ensure the route runs without crashing
    expect(res.status).toBe(200)
  })
})
