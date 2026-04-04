'use client'

import { get, set } from 'idb-keyval'
import { processVoiceLog } from '@/app/actions/voice'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

export type OfflineAction = {
  id: string
  type: 'voice-log'
  payload: Blob
  tankId?: string
  timestamp: number
}

const QUEUE_KEY = 'brewbrain_offline_queue'

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    return (await get<OfflineAction[]>(QUEUE_KEY)) || []
  } catch (err) {
    console.error('Failed to get offline queue:', err)
    return []
  }
}

export async function enqueueAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
  const queue = await getOfflineQueue()
  const newAction: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  }
  await set(QUEUE_KEY, [...queue, newAction])
  
  // Dispatch an event so the banner can update
  window.dispatchEvent(new Event('offline-queue-updated'))
}

let isProcessing = false

export async function processQueue() {
  if (isProcessing || !navigator.onLine) return
  
  isProcessing = true
  
  try {
    const queue = await getOfflineQueue()
    if (queue.length === 0) return

    const toastId = toast.loading(`Syncing ${queue.length} offline item(s)...`)
    
    let successCount = 0
    let failCount = 0
    const nextQueue: OfflineAction[] = []

    for (const item of queue) {
      if (!navigator.onLine) {
        // Lost connection halfway through syncing
        nextQueue.push(item)
        continue
      }
      
      if (item.type === 'voice-log') {
        try {
          const formData = new FormData()
          // Reconstruct the File from the Blob stored in IndexedDB
          const file = new File([item.payload], 'offline-voice-log.webm', { type: item.payload.type || 'audio/webm' })
          formData.append('audio', file)
          if (item.tankId) formData.append('tankId', item.tankId)

          const result = await processVoiceLog(formData)
          if (result?.success) {
            successCount++
          } else {
            console.error('Failed to process offline sync:', item.id, result?.error)
            failCount++
            toast.error(`Offline log failed: ${result?.error}. Please submit a new log.`, { duration: 30000 })
          }
        } catch (e) {
          console.error('Network error syncing item:', item.id, e)
          // Keep in queue if it was a network error during fetch
          nextQueue.push(item)
        }
      }
    }
    
    await set(QUEUE_KEY, nextQueue)
    window.dispatchEvent(new Event('offline-queue-updated'))

    if (successCount > 0) {
      toast.success(`Successfully synced ${successCount} offline item(s)`, { id: toastId })
    } else if (failCount > 0) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss(toastId)
    }

  } catch (err) {
    console.error('Error processing offline queue:', err)
  } finally {
    isProcessing = false
  }
}

// React Hook for connecting component state to the offline queue
export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initial loads
    setIsOnline(navigator.onLine)
    getOfflineQueue().then(q => setQueueCount(q.length))

    const handleOnline = () => {
      setIsOnline(true)
      processQueue()
    }
    const handleOffline = () => setIsOnline(false)
    const handleQueueUpdate = () => {
      getOfflineQueue().then(q => setQueueCount(q.length))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-queue-updated', handleQueueUpdate)

    // Try processing on mount just in case we are online
    processQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-queue-updated', handleQueueUpdate)
    }
  }, [])

  return { queueCount, isOnline }
}
