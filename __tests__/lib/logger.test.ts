import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appendFileSyncMock, captureServerExceptionMock, joinMock, statSyncMock, renameSyncMock } = vi.hoisted(() => ({
  appendFileSyncMock: vi.fn(),
  captureServerExceptionMock: vi.fn(),
  joinMock: vi.fn((...parts: string[]) => parts.join('/')),
  statSyncMock: vi.fn(),
  renameSyncMock: vi.fn(),
}))

vi.mock('fs', () => ({
  appendFileSync: appendFileSyncMock,
  statSync: statSyncMock,
  renameSync: renameSyncMock,
}))

vi.mock('path', () => ({
  join: joinMock,
}))

vi.mock('@/lib/sentry.server', () => ({
  captureServerException: captureServerExceptionMock,
}))

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    joinMock.mockImplementation((...parts: string[]) => parts.join('/'))
  })

  it('forwards server-side error logs to Sentry before writing to disk', async () => {
    statSyncMock.mockImplementation(() => { throw new Error('ENOENT') })

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

  it('writes info logs to disk without Sentry capture', async () => {
    statSyncMock.mockImplementation(() => { throw new Error('ENOENT') })

    const { logger } = await import('@/lib/logger')

    await logger.info('Server started', { port: 3000 })

    expect(captureServerExceptionMock).not.toHaveBeenCalled()
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1)
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('[INFO] Server started'),
    )
  })

  it('writes warn logs to disk without Sentry capture', async () => {
    statSyncMock.mockImplementation(() => { throw new Error('ENOENT') })

    const { logger } = await import('@/lib/logger')

    await logger.warn('Deprecated API used')

    expect(captureServerExceptionMock).not.toHaveBeenCalled()
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('[WARN] Deprecated API used'),
    )
  })

  it('writes debug logs to disk without Sentry capture', async () => {
    statSyncMock.mockImplementation(() => { throw new Error('ENOENT') })

    const { logger } = await import('@/lib/logger')

    await logger.debug('Query took 50ms')

    expect(captureServerExceptionMock).not.toHaveBeenCalled()
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('[DEBUG] Query took 50ms'),
    )
  })

  it('rotates log file when it exceeds max size', async () => {
    statSyncMock.mockReturnValue({ size: 11 * 1024 * 1024 }) // 11 MB > 10 MB max

    const { logger } = await import('@/lib/logger')

    await logger.info('Trigger rotation')

    expect(renameSyncMock).toHaveBeenCalled()
    expect(appendFileSyncMock).toHaveBeenCalled()
  })

  it('does not rotate when file is under max size', async () => {
    statSyncMock.mockReturnValue({ size: 1024 }) // 1 KB

    const { logger } = await import('@/lib/logger')

    await logger.info('Small file')

    expect(renameSyncMock).not.toHaveBeenCalled()
    expect(appendFileSyncMock).toHaveBeenCalled()
  })
})