import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appendFileSyncMock, captureServerExceptionMock, joinMock } = vi.hoisted(() => ({
  appendFileSyncMock: vi.fn(),
  captureServerExceptionMock: vi.fn(),
  joinMock: vi.fn((...parts: string[]) => parts.join('/')),
}))

vi.mock('fs', () => ({
  appendFileSync: appendFileSyncMock,
}))

vi.mock('path', () => ({
  join: joinMock,
}))

vi.mock('@/lib/sentry.server', () => ({
  captureServerException: captureServerExceptionMock,
}))

describe('logger.error', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('forwards server-side error logs to Sentry before writing to disk', async () => {
    const { logger } = await import('@/lib/logger')

    await logger.error('background task failed', { job: 'sync' })

    expect(captureServerExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        handler: 'logger.error',
        extras: expect.objectContaining({
          context: { job: 'sync' },
        }),
      }),
    )
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1)
  })
})