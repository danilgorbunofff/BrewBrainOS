import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appendFileSyncMock,
  captureExceptionMock,
  flushMock,
  initMock,
  joinMock,
  setExtraMock,
  setTagMock,
  mockCreateClient,
} = vi.hoisted(() => ({
  appendFileSyncMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  initMock: vi.fn(),
  joinMock: vi.fn((...parts: string[]) => parts.join('/')),
  setExtraMock: vi.fn(),
  setTagMock: vi.fn(),
  mockCreateClient: vi.fn(),
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

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/logs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockAuth(user: { id: string } | null = { id: 'user-1' }) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: () => Promise.resolve({ data: { user } }) },
  })
}

describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    process.env.SENTRY_DSN = 'https://server@example.ingest.sentry.io/1'
    flushMock.mockResolvedValue(true)
  })

  it('captures append failures with Sentry and returns 500', async () => {
    mockAuth()
    appendFileSyncMock.mockImplementation(() => {
      throw new Error('disk full')
    })

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'error',
      message: 'broken logger write',
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Failed to log' })
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error))
    expect(setTagMock).toHaveBeenCalledWith('handler', 'api/logs')
    expect(flushMock).toHaveBeenCalledWith(2000)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuth(null)

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'info',
      message: 'test',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ success: false, error: 'Unauthorized' })
  })

  it('writes log entry to file on valid request', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T12:00:00.000Z',
      level: 'info',
      message: 'App loaded',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('[INFO] App loaded'),
    )
  })

  it('returns 400 for invalid payload types', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: 123,
      level: 'info',
      message: 'test',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Invalid payload' })
  })

  it('returns 400 for invalid log level', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'critical',
      message: 'test',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Invalid log level' })
  })

  it('returns 400 when message exceeds max length', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'error',
      message: 'x'.repeat(2001),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Message too long' })
  })

  it('returns 400 when context exceeds max length', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'warn',
      message: 'test',
      context: { data: 'y'.repeat(4001) },
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Context too large' })
  })

  it('includes context in log entry when provided', async () => {
    mockAuth()

    const { POST } = await import('@/app/api/logs/route')
    const response = await POST(makeRequest({
      timestamp: '2026-04-07T00:00:00.000Z',
      level: 'debug',
      message: 'debug msg',
      context: { key: 'value' },
    }))

    expect(response.status).toBe(200)
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"key":"value"'),
    )
  })
})