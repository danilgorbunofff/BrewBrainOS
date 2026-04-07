import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appendFileSyncMock,
  captureExceptionMock,
  flushMock,
  initMock,
  joinMock,
  setExtraMock,
  setTagMock,
} = vi.hoisted(() => ({
  appendFileSyncMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  initMock: vi.fn(),
  joinMock: vi.fn((...parts: string[]) => parts.join('/')),
  setExtraMock: vi.fn(),
  setTagMock: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    appendFileSync: appendFileSyncMock,
  },
}))

vi.mock('path', () => ({
  default: {
    join: joinMock,
  },
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

describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.SENTRY_DSN = 'https://server@example.ingest.sentry.io/1'
  })

  it('captures append failures with Sentry and returns 500', async () => {
    appendFileSyncMock.mockImplementation(() => {
      throw new Error('disk full')
    })

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(new Request('http://localhost/api/logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        timestamp: '2026-04-07T00:00:00.000Z',
        level: 'error',
        message: 'broken logger write',
      }),
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Failed to log' })
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error))
    expect(setTagMock).toHaveBeenCalledWith('handler', 'api/logs')
    expect(flushMock).toHaveBeenCalledWith(2000)
  })
})