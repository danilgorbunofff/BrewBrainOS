import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureExceptionMock,
  flushMock,
  initMock,
  setExtraMock,
  setTagMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  initMock: vi.fn(),
  setExtraMock: vi.fn(),
  setTagMock: vi.fn(),
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

describe('sentry.server', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.SENTRY_DSN
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    delete process.env.SENTRY_ENV
    delete process.env.SENTRY_TRACES_SAMPLE_RATE
  })

  it('stays disabled when no DSN is configured', async () => {
    const sentryServer = await import('@/lib/sentry.server')

    expect(sentryServer.isServerSentryEnabled()).toBe(false)
    sentryServer.captureServerException(new Error('disabled'))
    await sentryServer.flushServerSentry(500)

    expect(initMock).not.toHaveBeenCalled()
    expect(captureExceptionMock).not.toHaveBeenCalled()
    expect(flushMock).not.toHaveBeenCalled()
  })

  it('initializes Sentry and captures scoped exceptions with normalized errors', async () => {
    process.env.SENTRY_DSN = 'https://server@example.ingest.sentry.io/1'
    process.env.SENTRY_ENV = 'test'
    process.env.SENTRY_TRACES_SAMPLE_RATE = 'not-a-number'

    const sentryServer = await import('@/lib/sentry.server')

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://server@example.ingest.sentry.io/1',
      environment: 'test',
      tracesSampleRate: 0.1,
    }))

    sentryServer.captureServerException('string failure', {
      handler: 'api/example',
      extras: { batchId: 'batch-1', retryable: true },
    })

    expect(setTagMock).toHaveBeenCalledWith('handler', 'api/example')
    expect(setExtraMock).toHaveBeenCalledWith('batchId', 'batch-1')
    expect(setExtraMock).toHaveBeenCalledWith('retryable', true)
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'string failure' }))
  })

  it('flushes initialized Sentry clients with the requested timeout', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/2'
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25'

    const sentryServer = await import('@/lib/sentry.server')
    await sentryServer.flushServerSentry(1500)

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://public@example.ingest.sentry.io/2',
      tracesSampleRate: 0.25,
    }))
    expect(flushMock).toHaveBeenCalledWith(1500)
  })
})