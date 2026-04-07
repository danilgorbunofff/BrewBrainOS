'use client'

import { useEffect, useState } from 'react'
import {
  clearOfflineQueue,
  enqueueAction,
  getOfflineQueue,
  processQueue,
  useOfflineQueue,
} from '@/lib/offlineQueue'

export function OfflineSyncFixturePage() {
  const { queueCount, isOnline } = useOfflineQueue()
  const [busy, setBusy] = useState(false)
  const [displayQueueCount, setDisplayQueueCount] = useState(queueCount)
  const [lastError, setLastError] = useState<string | null>(null)

  const refreshQueueCount = async () => {
    const queue = await getOfflineQueue()
    setDisplayQueueCount(queue.length)
    return queue.length
  }

  const clearQueue = async () => {
    await clearOfflineQueue()
    return refreshQueueCount()
  }

  const enqueueVoice = async () => {
    await enqueueAction({
      type: 'voice-log',
      payload: new Blob(['benchmark-audio'], { type: 'audio/webm' }),
    })

    return refreshQueueCount()
  }

  const flushQueue = async () => {
    await processQueue()
    return refreshQueueCount()
  }

  useEffect(() => {
    setDisplayQueueCount(queueCount)
  }, [queueCount])

  useEffect(() => {
    ;(window as Window & { __offlineSyncDisableBackgroundSync?: boolean }).__offlineSyncDisableBackgroundSync = true

    const api = {
      clearQueue,
      enqueueVoice,
      flushQueue,
      getQueueCount: refreshQueueCount,
    }

    ;(window as Window & { __offlineSyncFixture?: typeof api }).__offlineSyncFixture = api

    return () => {
      delete (window as Window & { __offlineSyncDisableBackgroundSync?: boolean }).__offlineSyncDisableBackgroundSync
      delete (window as Window & { __offlineSyncFixture?: typeof api }).__offlineSyncFixture
    }
  }, [queueCount])

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true)
    setLastError(null)
    try {
      await task()
      await refreshQueueCount()
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-testid="offline-sync-fixture-page" className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Offline Sync Fixture</h1>
          <p className="text-sm text-muted-foreground">Use this page to exercise queueing and cross-tab flushing flows.</p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-card/70 p-4">
          <div className="text-sm font-medium">
            Connection: <span data-testid="offline-sync-online-state">{isOnline ? 'online' : 'offline'}</span>
          </div>
          <div className="text-sm font-medium">
            Pending items: <span data-testid="offline-sync-queue-count">{displayQueueCount}</span>
          </div>
          {lastError ? (
            <div data-testid="offline-sync-last-error" className="text-sm text-red-400">
              {lastError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="offline-sync-clear"
            disabled={busy}
            onClick={() => run(clearQueue)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Clear queue
          </button>
          <button
            type="button"
            data-testid="offline-sync-enqueue-voice"
            disabled={busy}
            onClick={() => run(enqueueVoice)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Queue voice log
          </button>
          <button
            type="button"
            data-testid="offline-sync-process"
            disabled={busy}
            onClick={() => run(flushQueue)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Flush queue
          </button>
        </div>
      </div>
    </div>
  )
}