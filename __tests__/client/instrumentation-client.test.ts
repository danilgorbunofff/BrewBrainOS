// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { captureExceptionMock, initMock, reportPerformanceMetricMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  initMock: vi.fn(),
  reportPerformanceMetricMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
  init: initMock,
}))

vi.mock('@/lib/performance-monitoring', () => ({
  reportPerformanceMetric: reportPerformanceMetricMock,
}))

describe('instrumentation-client', () => {
  beforeAll(async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://browser@example.ingest.sentry.io/1')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE', '0.25')
    vi.spyOn(window.performance, 'mark').mockImplementation(() => undefined)

    await import('@/instrumentation-client')
  })

  beforeEach(() => {
    captureExceptionMock.mockClear()
    reportPerformanceMetricMock.mockClear()
  })

  it('initializes the browser SDK when a public DSN is present', () => {
    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://browser@example.ingest.sentry.io/1',
      tracesSampleRate: 0.25,
    }))
  })

  it('captures window errors and keeps performance reporting', () => {
    const errorEvent = new Event('error') as Event & {
      colno: number
      error: Error
      filename: string
      lineno: number
      message: string
    }

    Object.defineProperties(errorEvent, {
      colno: { value: 18 },
      error: { value: new Error('client boom') },
      filename: { value: 'http://localhost/app' },
      lineno: { value: 12 },
      message: { value: 'client boom' },
    })

    window.dispatchEvent(errorEvent)

    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error))
    expect(reportPerformanceMetricMock).toHaveBeenCalledWith(expect.objectContaining({
      category: 'client-error',
      name: 'window-error',
      unit: 'count',
      value: 1,
    }))
  })

  it('captures unhandled rejections and keeps performance reporting', () => {
    const rejectionEvent = new Event('unhandledrejection') as Event & { reason: string }

    Object.defineProperty(rejectionEvent, 'reason', {
      value: 'promise exploded',
    })

    window.dispatchEvent(rejectionEvent)

    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error))
    expect(reportPerformanceMetricMock).toHaveBeenCalledWith(expect.objectContaining({
      category: 'client-error',
      name: 'unhandled-rejection',
      unit: 'count',
      value: 1,
    }))
  })
})