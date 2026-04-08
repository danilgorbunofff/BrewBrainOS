// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueStore = new Map<string, unknown>()
const toastLoadingMock = vi.fn(() => 'toast-id')
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const toastDismissMock = vi.fn()

class BroadcastChannelMock {
  static channels = new Map<string, Set<BroadcastChannelMock>>()

  name: string
  listeners = new Set<(event: MessageEvent) => void>()

  constructor(name: string) {
    this.name = name
    const existing = BroadcastChannelMock.channels.get(name) || new Set<BroadcastChannelMock>()
    existing.add(this)
    BroadcastChannelMock.channels.set(name, existing)
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener)
  }

  postMessage(data: unknown) {
    const peers = BroadcastChannelMock.channels.get(this.name) || new Set<BroadcastChannelMock>()
    for (const peer of peers) {
      if (peer === this) {
        continue
      }

      for (const listener of peer.listeners) {
        listener({ data } as MessageEvent)
      }
    }
  }

  close() {
    const peers = BroadcastChannelMock.channels.get(this.name)
    peers?.delete(this)
  }

  static reset() {
    BroadcastChannelMock.channels.clear()
  }
}

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => queueStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    queueStore.set(key, value)
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    loading: toastLoadingMock,
    success: toastSuccessMock,
    error: toastErrorMock,
    dismiss: toastDismissMock,
  },
}))

async function loadOfflineQueueModule() {
  vi.resetModules()
  return import('@/lib/offlineQueue')
}

describe('offlineQueue', () => {
  beforeEach(() => {
    queueStore.clear()
    BroadcastChannelMock.reset()
    toastLoadingMock.mockClear()
    toastSuccessMock.mockClear()
    toastErrorMock.mockClear()
    toastDismissMock.mockClear()
    window.localStorage.clear()
    global.fetch = vi.fn()

    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: BroadcastChannelMock,
    })

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: {
            register: vi.fn(),
          },
        }),
        getRegistration: vi.fn().mockResolvedValue({
          sync: {
            register: vi.fn(),
          },
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })

    Object.defineProperty(window, 'SyncManager', {
      configurable: true,
      value: function SyncManager() {},
    })
  })

  it('stores an external id when queueing a manual reading', async () => {
    const { enqueueAction, getOfflineQueue } = await loadOfflineQueueModule()

    const queued = await enqueueAction({
      type: 'manual-reading',
      payload: { batchId: 'batch-1', gravity: '1.045' },
    })

    const queue = await getOfflineQueue()

    expect(queued.externalId).toMatch(/[0-9a-f-]{36}/i)
    expect(queue).toHaveLength(1)
    expect(queue[0]?.externalId).toBe(queued.externalId)
  })

  it('registers background sync after enqueueing when supported', async () => {
    const registerMock = vi.fn()

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({ sync: { register: registerMock } }),
        getRegistration: vi.fn().mockResolvedValue({ sync: { register: registerMock } }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })

    const { enqueueAction } = await loadOfflineQueueModule()

    await enqueueAction({
      type: 'voice-log',
      payload: new Blob(['audio'], { type: 'audio/webm' }),
    })

    expect(registerMock).toHaveBeenCalledWith('sync-offline-queue')
  })

  it('replays queued voice and manual readings with external ids', async () => {
    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'voice-1',
        externalId: '11111111-1111-1111-1111-111111111111',
        type: 'voice-log',
        payload: new Blob(['audio'], { type: 'audio/webm' }),
        tankId: 'tank-1',
        timestamp: Date.now(),
      },
      {
        id: 'manual-1',
        externalId: '22222222-2222-2222-2222-222222222222',
        type: 'manual-reading',
        payload: {
          batchId: 'batch-1',
          gravity: '1.050',
          notes: 'stable',
        },
        timestamp: Date.now(),
      },
    ])

    vi.mocked(global.fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      const formData = init?.body as FormData

      if (url.endsWith('/api/sync-voice')) {
        expect(formData.get('external_id')).toBe('11111111-1111-1111-1111-111111111111')
        expect(formData.get('tankId')).toBe('tank-1')
      }

      if (url.endsWith('/api/sync-manual-reading')) {
        expect(formData.get('external_id')).toBe('22222222-2222-2222-2222-222222222222')
        expect(formData.get('batchId')).toBe('batch-1')
        expect(formData.get('gravity')).toBe('1.050')
        expect(formData.get('notes')).toBe('stable')
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const { processQueue } = await loadOfflineQueueModule()
    await processQueue()

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(queueStore.get('brewbrain_offline_queue')).toEqual([])
  })

  it('does not process the queue when another tab already holds the lock', async () => {
    window.localStorage.setItem('brewbrain_offline_queue_processing_lock', JSON.stringify({
      owner: 'other-tab',
      expiresAt: Date.now() + 60_000,
    }))

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'voice-1',
        externalId: '11111111-1111-1111-1111-111111111111',
        type: 'voice-log',
        payload: new Blob(['audio'], { type: 'audio/webm' }),
        timestamp: Date.now(),
      },
    ])

    const { processQueue } = await loadOfflineQueueModule()
    await processQueue()

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not process the queue while offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'manual-1',
        externalId: '22222222-2222-2222-2222-222222222222',
        type: 'manual-reading',
        payload: { batchId: 'batch-1', gravity: '1.050' },
        timestamp: Date.now(),
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: Date.now(),
      },
    ])

    const { processQueue, getOfflineQueue } = await loadOfflineQueueModule()
    await processQueue()

    expect(global.fetch).not.toHaveBeenCalled()
    expect((await getOfflineQueue())).toHaveLength(1)
  })

  it('schedules retry metadata for transient failures', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: 'Temporary outage',
      retryable: true,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }))

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'voice-1',
        externalId: '11111111-1111-1111-1111-111111111111',
        type: 'voice-log',
        payload: new Blob(['audio'], { type: 'audio/webm' }),
        timestamp: 10,
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: 10,
      },
    ])

    const { processQueue, getOfflineQueue } = await loadOfflineQueueModule()
    await processQueue()

    const queue = await getOfflineQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0]?.attempts).toBe(1)
    expect(queue[0]?.lastAttemptAt).toBeTypeOf('number')
    expect(queue[0]?.nextAttemptAt).toBeGreaterThan(queue[0]?.lastAttemptAt ?? 0)
    expect(queue[0]?.lastError).toBe('Temporary outage')
  })

  it('removes permanently failing items and surfaces the failure toast', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: 'Validation failed',
      retryable: false,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'manual-1',
        externalId: '22222222-2222-2222-2222-222222222222',
        type: 'manual-reading',
        payload: { batchId: 'batch-1', gravity: '1.050' },
        timestamp: Date.now(),
        attempts: 4,
        lastAttemptAt: null,
        nextAttemptAt: Date.now(),
      },
    ])

    const { processQueue, getOfflineQueue } = await loadOfflineQueueModule()
    await processQueue()

    expect(await getOfflineQueue()).toEqual([])
    expect(toastDismissMock).toHaveBeenCalledWith('toast-id')
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it('clears the queue and emits an update event', async () => {
    const updateListener = vi.fn()
    window.addEventListener('offline-queue-updated', updateListener)

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'manual-1',
        externalId: '22222222-2222-2222-2222-222222222222',
        type: 'manual-reading',
        payload: { batchId: 'batch-1' },
        timestamp: Date.now(),
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: Date.now(),
      },
    ])

    const { clearOfflineQueue, getOfflineQueue } = await loadOfflineQueueModule()
    await clearOfflineQueue()

    expect(await getOfflineQueue()).toEqual([])
    expect(updateListener).toHaveBeenCalledTimes(1)

    window.removeEventListener('offline-queue-updated', updateListener)
  })

  it('tracks queue count and online status through the hook lifecycle', async () => {
    const swListeners = new Set<(event: MessageEvent) => void>()

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({ sync: { register: vi.fn() } }),
        addEventListener: vi.fn((_type: 'message', listener: (event: MessageEvent) => void) => {
          swListeners.add(listener)
        }),
        removeEventListener: vi.fn((_type: 'message', listener: (event: MessageEvent) => void) => {
          swListeners.delete(listener)
        }),
      },
    })

    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'manual-1',
        externalId: '22222222-2222-2222-2222-222222222222',
        type: 'manual-reading',
        payload: { batchId: 'batch-1', gravity: '1.050' },
        timestamp: Date.now(),
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: Date.now() + 60_000,
      },
    ])

    const { useOfflineQueue } = await loadOfflineQueueModule()
    const { result } = renderHook(() => useOfflineQueue())

    await waitFor(() => expect(result.current.queueCount).toBe(1))
    expect(result.current.isOnline).toBe(true)

    queueStore.set('brewbrain_offline_queue', [])
    act(() => {
      window.dispatchEvent(new Event('offline-queue-updated'))
    })

    await waitFor(() => expect(result.current.queueCount).toBe(0))

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.isOnline).toBe(false)

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    queueStore.set('brewbrain_offline_queue', [
      {
        id: 'manual-2',
        externalId: '33333333-3333-3333-3333-333333333333',
        type: 'manual-reading',
        payload: { batchId: 'batch-2', gravity: '1.044' },
        timestamp: Date.now(),
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: Date.now(),
      },
    ])
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    act(() => {
      for (const listener of swListeners) {
        listener({ data: { type: 'PROCESS_OFFLINE_QUEUE' } } as MessageEvent)
      }
    })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  })
})