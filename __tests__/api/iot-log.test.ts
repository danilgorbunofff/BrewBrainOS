import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureExceptionMock,
  createClientMock,
  flushMock,
  initMock,
  insertMock,
  selectSingleMock,
  setExtraMock,
  setTagMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  createClientMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  initMock: vi.fn(),
  insertMock: vi.fn(),
  selectSingleMock: vi.fn(),
  setExtraMock: vi.fn(),
  setTagMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
  flush: flushMock,
  init: initMock,
  withScope: (callback: (scope: { setExtra: typeof setExtraMock; setTag: typeof setTagMock }) => void) => {
    callback({
      setExtra: setExtraMock,
      setTag: setTagMock,
    })
  },
}))

describe('POST /api/iot/log', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.SENTRY_DSN = 'https://server@example.ingest.sentry.io/1'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

    selectSingleMock.mockResolvedValue({
      data: { id: 'brewery-1', owner_id: 'owner-1' },
      error: null,
    })

    insertMock.mockResolvedValue({
      error: { message: 'insert exploded' },
    })

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === 'breweries') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: selectSingleMock,
          }

          return query
        }

        if (table === 'batch_readings') {
          return {
            insert: insertMock,
          }
        }

        throw new Error(`Unexpected table lookup: ${table}`)
      },
    })
  })

  it('captures insert failures with Sentry and returns 500', async () => {
    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer sensor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        temperature: 18.5,
      }),
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to log reading: insert exploded' })
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error))
    expect(setTagMock).toHaveBeenCalledWith('handler', 'api/iot/log')
    expect(flushMock).toHaveBeenCalledWith(2000)
  })

  it('returns 401 when authorization header is missing', async () => {
    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batch_id: 'batch-1', temperature: 18.5 }),
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized: Missing or invalid token' })
  })

  it('returns 400 when neither tank_id nor batch_id is provided', async () => {
    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer sensor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ temperature: 18.5 }),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Bad Request: Must provide either tank_id or batch_id' })
  })

  it('returns success when the reading is inserted', async () => {
    insertMock.mockResolvedValue({ error: null })

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === 'breweries') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: selectSingleMock,
          }
          return query
        }
        if (table === 'batch_readings') {
          return { insert: insertMock, select: selectMock }
        }
        throw new Error(`Unexpected table lookup: ${table}`)
      },
    })

    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer sensor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ batch_id: 'batch-1', temperature: 18.5 }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true })
  })

  it('returns 401 when brewery token is invalid', async () => {
    selectSingleMock.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer bad-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ batch_id: 'batch-1', temperature: 18.5 }),
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'Unauthorized: Invalid token' })
  })

  it('resolves batch from tank_id when batch_id is not provided', async () => {
    insertMock.mockResolvedValue({ error: null })

    const tankSelectSingle = vi.fn().mockResolvedValue({
      data: { current_batch_id: 'resolved-batch' },
      error: null,
    })

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === 'breweries') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: selectSingleMock,
          }
          return query
        }
        if (table === 'tanks') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: tankSelectSingle,
          }
          return query
        }
        if (table === 'batch_readings') {
          return { insert: insertMock, select: selectMock }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: null }) }) }) }) }
      },
    })

    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer sensor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ tank_id: 'tank-1', temperature: 20 }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, batch_id: 'resolved-batch' })
  })

  it('returns 404 when tank has no active batch', async () => {
    const tankSelectSingle = vi.fn().mockResolvedValue({
      data: { current_batch_id: null },
      error: null,
    })

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === 'breweries') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: selectSingleMock,
          }
          return query
        }
        if (table === 'tanks') {
          const query = {
            eq: vi.fn(() => query),
            select: vi.fn(() => query),
            single: tankSelectSingle,
          }
          return query
        }
        return {}
      },
    })

    const { POST } = await import('@/app/api/iot/log/route')
    const response = await POST(new Request('http://localhost/api/iot/log', {
      method: 'POST',
      headers: {
        authorization: 'Bearer sensor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ tank_id: 'tank-empty' }),
    }))

    expect(response.status).toBe(404)
  })
})