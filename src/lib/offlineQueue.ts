'use client'

import { toast } from 'sonner'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  clearOfflineQueue as clearOfflineQueueStore,
  enqueueOfflineAction,
  flushOfflineQueue,
  getOfflineQueue,
  OFFLINE_QUEUE_SYNC_TAG,
  syncOfflineActionViaApi,
  type EnqueueOfflineAction,
  type ManualReadingPayload,
  type OfflineAction,
} from '@/lib/offlineQueueShared'

const PROCESSING_LOCK_KEY = 'brewbrain_offline_queue_processing_lock'
const PROCESSING_LOCK_TTL_MS = 45_000
const PROCESSING_LOCK_REFRESH_MS = 15_000
const QUEUE_CHANNEL_NAME = 'brewbrain-offline-queue'

type ProcessingLock = {
  owner: string
  expiresAt: number
}

type QueueChannelMessage = {
  type: 'queue-updated' | 'queue-available'
}

const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `offline-tab-${Math.random().toString(36).slice(2)}`

let queueChannel: BroadcastChannel | null | undefined
let isProcessing = false

function getQueueChannel() {
  if (queueChannel !== undefined) {
    return queueChannel
  }

  if (typeof BroadcastChannel === 'undefined') {
    queueChannel = null
    return queueChannel
  }

  queueChannel = new BroadcastChannel(QUEUE_CHANNEL_NAME)
  return queueChannel
}

function notifyQueueUpdated() {
  window.dispatchEvent(new Event('offline-queue-updated'))
  getQueueChannel()?.postMessage({ type: 'queue-updated' } satisfies QueueChannelMessage)
}

function notifyQueueAvailable() {
  getQueueChannel()?.postMessage({ type: 'queue-available' } satisfies QueueChannelMessage)
}

function getCurrentLock(): ProcessingLock | null {
  try {
    const rawLock = window.localStorage.getItem(PROCESSING_LOCK_KEY)
    if (!rawLock) {
      return null
    }

    const parsed = JSON.parse(rawLock) as Partial<ProcessingLock>
    if (typeof parsed.owner !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null
    }

    return {
      owner: parsed.owner,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

function writeLock(lock: ProcessingLock) {
  window.localStorage.setItem(PROCESSING_LOCK_KEY, JSON.stringify(lock))
}

async function acquireProcessingClaim() {
  try {
    const now = Date.now()
    const currentLock = getCurrentLock()

    if (currentLock && currentLock.owner !== TAB_ID && currentLock.expiresAt > now) {
      return false
    }

    writeLock({ owner: TAB_ID, expiresAt: now + PROCESSING_LOCK_TTL_MS })
    return getCurrentLock()?.owner === TAB_ID
  } catch {
    return true
  }
}

function refreshProcessingClaim() {
  try {
    const currentLock = getCurrentLock()
    if (!currentLock || currentLock.owner !== TAB_ID) {
      return
    }

    writeLock({ owner: TAB_ID, expiresAt: Date.now() + PROCESSING_LOCK_TTL_MS })
  } catch {
    // Ignore claim refresh failures and continue processing.
  }
}

function releaseProcessingClaim(hasPendingWork = false) {
  try {
    const currentLock = getCurrentLock()
    if (currentLock?.owner === TAB_ID) {
      window.localStorage.removeItem(PROCESSING_LOCK_KEY)
    }
  } finally {
    if (hasPendingWork) {
      notifyQueueAvailable()
    }
  }
}

export async function enqueueAction(action: EnqueueOfflineAction) {
  const newAction = await enqueueOfflineAction(action)

  notifyQueueUpdated()

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(OFFLINE_QUEUE_SYNC_TAG)
    } catch (error) {
      console.warn('Background sync registration failed:', error)
    }
  }

  return newAction
}

export async function clearOfflineQueue() {
  await clearOfflineQueueStore()
  notifyQueueUpdated()
}

export async function processQueue() {
  if (isProcessing || !navigator.onLine) {
    return
  }

  const hasClaim = await acquireProcessingClaim()
  if (!hasClaim) {
    return
  }

  isProcessing = true
  const claimRefreshInterval = globalThis.setInterval(refreshProcessingClaim, PROCESSING_LOCK_REFRESH_MS)
  let hasPendingWork = false

  try {
    const queue = await getOfflineQueue()
    if (queue.length === 0) {
      return
    }

    const toastId = toast.loading(`Syncing ${queue.length} offline item(s)...`)
    const result = await flushOfflineQueue({
      syncAction: syncOfflineActionViaApi,
      isOnline: () => navigator.onLine,
      onQueueUpdated: notifyQueueUpdated,
    })

    hasPendingWork = result.remainingCount > 0

    if (result.successCount > 0) {
      toast.success(`Successfully synced ${result.successCount} offline item(s)`, { id: toastId })
    } else {
      toast.dismiss(toastId)
    }

    if (result.permanentFailureCount > 0) {
      toast.error(
        `${result.permanentFailureCount} offline item(s) could not be synced and were removed. Submit them again.`,
        { duration: 30000 },
      )
    }
  } catch (error) {
    console.error('Error processing offline queue:', error)
  } finally {
    globalThis.clearInterval(claimRefreshInterval)
    isProcessing = false
    releaseProcessingClaim(hasPendingWork)
  }
}

export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0)
  const isOnline = useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)

      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => navigator.onLine,
    () => true,
  )

  useEffect(() => {
    getOfflineQueue().then((queue) => setQueueCount(queue.length))
    const queueChannel = getQueueChannel()

    const handleOnline = () => {
      processQueue()
    }

    const handleQueueUpdate = () => {
      getOfflineQueue().then((queue) => setQueueCount(queue.length))
    }

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PROCESS_OFFLINE_QUEUE') {
        processQueue()
      }
    }

    const handleChannelMessage = (event: MessageEvent<QueueChannelMessage>) => {
      if (event.data?.type === 'queue-updated') {
        handleQueueUpdate()
      }

      if (event.data?.type === 'queue-available') {
        processQueue()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline-queue-updated', handleQueueUpdate)
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)
    queueChannel?.addEventListener('message', handleChannelMessage)

    processQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline-queue-updated', handleQueueUpdate)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
      queueChannel?.removeEventListener('message', handleChannelMessage)
    }
  }, [])

  return { queueCount, isOnline }
}

export { getOfflineQueue, type EnqueueOfflineAction, type ManualReadingPayload, type OfflineAction }
