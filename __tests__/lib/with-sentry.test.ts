import { beforeEach, describe, expect, it, vi } from 'vitest'

const { captureServerExceptionMock, flushServerSentryMock } = vi.hoisted(() => ({
  captureServerExceptionMock: vi.fn(),
  flushServerSentryMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/sentry.server', () => ({
  captureServerException: captureServerExceptionMock,
  flushServerSentry: flushServerSentryMock,
}))

describe('withSentry', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('passes through successful responses without capturing', async () => {
    const { withSentry } = await import('@/lib/with-sentry')
    const handler = withSentry(async (_req: Request) => new Response('ok', { status: 201 }), { name: 'api/success' })

    const response = await handler(new Request('http://localhost/test'))

    expect(response.status).toBe(201)
    await expect(response.text()).resolves.toBe('ok')
    expect(captureServerExceptionMock).not.toHaveBeenCalled()
    expect(flushServerSentryMock).not.toHaveBeenCalled()
  })

  it('returns a default 500 response and flushes captured errors', async () => {
    const { withSentry } = await import('@/lib/with-sentry')
    const handler = withSentry(async () => {
      throw 'write failed'
    }, {
      flushTimeout: 1234,
      name: 'api/default-error',
    })

    const response = await handler()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'write failed' })
    expect(captureServerExceptionMock).toHaveBeenCalledWith('write failed', { handler: 'api/default-error' })
    expect(flushServerSentryMock).toHaveBeenCalledWith(1234)
  })

  it('delegates to onError when provided', async () => {
    const { withSentry } = await import('@/lib/with-sentry')
    const handler = withSentry(async (_request: Request, itemId: string) => {
      throw new Error('boom')
    }, {
      name: 'api/custom-error',
      onError: (error, _request, itemId) => Response.json({
        itemId,
        message: error instanceof Error ? error.message : String(error),
      }, { status: 418 }),
    })

    const response = await handler(new Request('http://localhost/test'), 'batch-1')

    expect(response.status).toBe(418)
    await expect(response.json()).resolves.toEqual({ itemId: 'batch-1', message: 'boom' })
    expect(captureServerExceptionMock).toHaveBeenCalledWith(expect.any(Error), { handler: 'api/custom-error' })
    expect(flushServerSentryMock).toHaveBeenCalledWith(2000)
  })

  it('rethrows errors when requested', async () => {
    const { withSentry } = await import('@/lib/with-sentry')
    const handler = withSentry(async () => {
      throw new Error('rethrow me')
    }, {
      name: 'api/rethrow',
      rethrow: true,
    })

    await expect(handler()).rejects.toThrow('rethrow me')
    expect(captureServerExceptionMock).toHaveBeenCalledWith(expect.any(Error), { handler: 'api/rethrow' })
    expect(flushServerSentryMock).toHaveBeenCalledWith(2000)
  })

  it('wraps JSON payload handlers', async () => {
    const { withSentryJson } = await import('@/lib/with-sentry')
    const handler = withSentryJson(async (_request: Request, id: string) => ({ ok: true, id }))

    const response = await handler(new Request('http://localhost/test'), 'item-7')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, id: 'item-7' })
  })
})