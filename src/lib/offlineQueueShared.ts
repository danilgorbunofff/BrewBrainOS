import { get, set } from 'idb-keyval'

export type ManualReadingPayload = {
  batchId: string
  temperature?: string
  gravity?: string
  ph?: string
  dissolved_oxygen?: string
  pressure?: string
  notes?: string
}

type OfflineActionBase = {
  id: string
  externalId: string
  timestamp: number
  attempts: number
  lastAttemptAt: number | null
  nextAttemptAt: number
  lastError?: string
}

export type OfflineAction =
  | (OfflineActionBase & {
      type: 'voice-log'
      payload: Blob
      tankId?: string
    })
  | (OfflineActionBase & {
      type: 'manual-reading'
      payload: ManualReadingPayload
    })

export type EnqueueOfflineAction =
  | {
      type: 'voice-log'
      payload: Blob
      tankId?: string
      externalId?: string
    }
  | {
      type: 'manual-reading'
      payload: ManualReadingPayload
      externalId?: string
    }

type StoredOfflineAction = Partial<OfflineAction> & {
  type?: OfflineAction['type']
  payload?: Blob | ManualReadingPayload
}

export type SyncTransportResult = {
  ok: boolean
  retryable?: boolean
  error?: string
  status?: number
}

export type FlushOfflineQueueResult = {
  initialCount: number
  processedCount: number
  successCount: number
  retryScheduledCount: number
  permanentFailureCount: number
  remainingCount: number
  permanentFailures: Array<{ id: string; type: OfflineAction['type']; error: string }>
}

type FlushOfflineQueueOptions = {
  syncAction: (item: OfflineAction) => Promise<SyncTransportResult>
  isOnline?: () => boolean
  now?: () => number
  onQueueUpdated?: () => void
}

export const OFFLINE_QUEUE_KEY = 'brewbrain_offline_queue'
export const OFFLINE_QUEUE_SYNC_TAG = 'sync-offline-queue'
export const OFFLINE_QUEUE_VOICE_ROUTE = '/api/sync-voice'
export const OFFLINE_QUEUE_MANUAL_ROUTE = '/api/sync-manual-reading'
export const OFFLINE_QUEUE_MAX_ATTEMPTS = 5

const RETRY_BASE_DELAY_MS = 30_000
const RETRY_MAX_DELAY_MS = 15 * 60_000

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function normalizeManualReadingPayload(payload: ManualReadingPayload): ManualReadingPayload {
  return {
    batchId: payload.batchId,
    temperature: normalizeOptionalString(payload.temperature),
    gravity: normalizeOptionalString(payload.gravity),
    ph: normalizeOptionalString(payload.ph),
    dissolved_oxygen: normalizeOptionalString(payload.dissolved_oxygen),
    pressure: normalizeOptionalString(payload.pressure),
    notes: normalizeOptionalString(payload.notes),
  }
}

function normalizeAttemptCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function normalizeTimestamp(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizeOfflineAction(action: StoredOfflineAction): OfflineAction | null {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
    return null
  }

  const id = typeof action.id === 'string' ? action.id : crypto.randomUUID()
  const externalId = typeof action.externalId === 'string' ? action.externalId : id
  const timestamp = normalizeTimestamp(action.timestamp, Date.now())
  const attempts = normalizeAttemptCount(action.attempts)
  const lastAttemptAt = action.lastAttemptAt === null
    ? null
    : normalizeTimestamp(action.lastAttemptAt, null as never)
  const nextAttemptAt = normalizeTimestamp(action.nextAttemptAt, timestamp)
  const lastError = normalizeOptionalString(action.lastError)

  if (action.type === 'voice-log' && action.payload instanceof Blob) {
    return {
      id,
      externalId,
      type: 'voice-log',
      payload: action.payload,
      tankId: typeof action.tankId === 'string' ? action.tankId : undefined,
      timestamp,
      attempts,
      lastAttemptAt,
      nextAttemptAt,
      lastError,
    }
  }

  if (action.type === 'manual-reading' && action.payload && typeof action.payload === 'object') {
    const payload = action.payload as ManualReadingPayload
    if (typeof payload.batchId !== 'string' || payload.batchId.trim().length === 0) {
      return null
    }

    return {
      id,
      externalId,
      type: 'manual-reading',
      payload: normalizeManualReadingPayload({
        ...payload,
        batchId: payload.batchId.trim(),
      }),
      timestamp,
      attempts,
      lastAttemptAt,
      nextAttemptAt,
      lastError,
    }
  }

  return null
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const queue = (await get<StoredOfflineAction[]>(OFFLINE_QUEUE_KEY)) || []
    if (!Array.isArray(queue)) {
      return []
    }

    return queue
      .map((item) => normalizeOfflineAction(item))
      .filter((item): item is OfflineAction => item !== null)
  } catch (error) {
    console.error('Failed to read offline queue:', error)
    return []
  }
}

export async function saveOfflineQueue(queue: OfflineAction[]) {
  await set(OFFLINE_QUEUE_KEY, queue)
}

export async function clearOfflineQueue() {
  await saveOfflineQueue([])
}

export async function enqueueOfflineAction(action: EnqueueOfflineAction) {
  const queue = await getOfflineQueue()
  const externalId = action.externalId || crypto.randomUUID()
  const now = Date.now()
  const nextAction: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    externalId,
    timestamp: now,
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: now,
    lastError: undefined,
  }

  await saveOfflineQueue([...queue, nextAction])
  return nextAction
}

function createManualReadingFormData(action: Extract<OfflineAction, { type: 'manual-reading' }>) {
  const formData = new FormData()
  formData.append('batchId', action.payload.batchId)
  formData.append('external_id', action.externalId)

  const fields: Array<keyof Omit<ManualReadingPayload, 'batchId'>> = [
    'temperature',
    'gravity',
    'ph',
    'dissolved_oxygen',
    'pressure',
    'notes',
  ]

  for (const field of fields) {
    const value = action.payload[field]
    if (value) {
      formData.append(field, value)
    }
  }

  return formData
}

function createVoiceLogFormData(action: Extract<OfflineAction, { type: 'voice-log' }>) {
  const formData = new FormData()
  formData.append('audio', action.payload, 'offline-voice-log.webm')
  formData.append('external_id', action.externalId)

  if (action.tankId) {
    formData.append('tankId', action.tankId)
  }

  return formData
}

export function buildOfflineSyncRequest(action: OfflineAction) {
  if (action.type === 'voice-log') {
    return {
      url: OFFLINE_QUEUE_VOICE_ROUTE,
      formData: createVoiceLogFormData(action),
    }
  }

  return {
    url: OFFLINE_QUEUE_MANUAL_ROUTE,
    formData: createManualReadingFormData(action),
  }
}

function isRetryableStatus(status?: number) {
  if (!status) {
    return true
  }

  return status === 401
    || status === 403
    || status === 408
    || status === 425
    || status === 429
    || status >= 500
}

export function classifySyncFailure(status: number | undefined, error: string | undefined) {
  if (typeof error === 'string') {
    if (/unauthorized|no brewery found|authentication/i.test(error)) {
      return true
    }

    if (/network|timeout|temporar|rate limit|fetch/i.test(error)) {
      return true
    }
  }

  return isRetryableStatus(status)
}

async function parseSyncError(response: Response) {
  try {
    const payload = await response.json() as { error?: string; retryable?: boolean }
    return {
      error: typeof payload.error === 'string' ? payload.error : undefined,
      retryable: typeof payload.retryable === 'boolean'
        ? payload.retryable
        : classifySyncFailure(response.status, payload.error),
    }
  } catch {
    return {
      error: response.statusText || 'Sync failed',
      retryable: classifySyncFailure(response.status, response.statusText),
    }
  }
}

export async function syncOfflineActionViaApi(
  action: OfflineAction,
  fetchImpl: typeof fetch = fetch,
): Promise<SyncTransportResult> {
  const { url, formData } = buildOfflineSyncRequest(action)

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      cache: 'no-store',
    })

    if (response.ok) {
      return { ok: true, status: response.status }
    }

    const parsed = await parseSyncError(response)
    return {
      ok: false,
      status: response.status,
      error: parsed.error || 'Sync failed',
      retryable: parsed.retryable,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error during sync'
    return {
      ok: false,
      error: message,
      retryable: true,
    }
  }
}

function getRetryDelayMs(attemptNumber: number) {
  const exponentialDelay = RETRY_BASE_DELAY_MS * (2 ** Math.max(attemptNumber - 1, 0))
  return Math.min(exponentialDelay, RETRY_MAX_DELAY_MS)
}

function scheduleRetry(action: OfflineAction, error: string, now: number): OfflineAction {
  const attempts = action.attempts + 1
  return {
    ...action,
    attempts,
    lastAttemptAt: now,
    nextAttemptAt: now + getRetryDelayMs(attempts),
    lastError: error,
  }
}

export async function flushOfflineQueue({
  syncAction,
  isOnline = () => true,
  now = () => Date.now(),
  onQueueUpdated,
}: FlushOfflineQueueOptions): Promise<FlushOfflineQueueResult> {
  const queue = await getOfflineQueue()
  if (queue.length === 0) {
    return {
      initialCount: 0,
      processedCount: 0,
      successCount: 0,
      retryScheduledCount: 0,
      permanentFailureCount: 0,
      remainingCount: 0,
      permanentFailures: [],
    }
  }

  const nextQueue: OfflineAction[] = []
  const permanentFailures: FlushOfflineQueueResult['permanentFailures'] = []
  let processedCount = 0
  let successCount = 0
  let retryScheduledCount = 0
  let permanentFailureCount = 0

  for (const item of queue) {
    if (!isOnline()) {
      nextQueue.push(item)
      continue
    }

    const attemptTimestamp = now()
    if (item.nextAttemptAt > attemptTimestamp) {
      nextQueue.push(item)
      continue
    }

    processedCount += 1
    const result = await syncAction(item)

    if (result.ok) {
      successCount += 1
      continue
    }

    const errorMessage = result.error || 'Sync failed'
    const retryable = result.retryable ?? classifySyncFailure(result.status, errorMessage)

    if (retryable && item.attempts + 1 < OFFLINE_QUEUE_MAX_ATTEMPTS) {
      nextQueue.push(scheduleRetry(item, errorMessage, attemptTimestamp))
      retryScheduledCount += 1
      continue
    }

    permanentFailureCount += 1
    permanentFailures.push({ id: item.id, type: item.type, error: errorMessage })
  }

  await saveOfflineQueue(nextQueue)
  onQueueUpdated?.()

  return {
    initialCount: queue.length,
    processedCount,
    successCount,
    retryScheduledCount,
    permanentFailureCount,
    remainingCount: nextQueue.length,
    permanentFailures,
  }
}