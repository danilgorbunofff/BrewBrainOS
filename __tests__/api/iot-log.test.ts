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
})