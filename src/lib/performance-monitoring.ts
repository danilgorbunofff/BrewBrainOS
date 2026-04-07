import {
  getPerformanceMonitoringEndpoint,
  isPerformanceMonitoringEnabledOnClient,
  shouldLogPerformanceToConsole,
} from '@/lib/feature-flags'

export type PerformanceMetricCategory =
  | 'client-error'
  | 'longtask'
  | 'navigation'
  | 'paint'
  | 'virtualization'
  | 'web-vital'

export interface PerformanceMetricPayload {
  category: PerformanceMetricCategory
  name: string
  value: number
  unit?: string
  path: string
  timestamp: number
  detail?: Record<string, unknown>
}

declare global {
  interface Window {
    __brewbrainPerformanceMetrics?: PerformanceMetricPayload[]
  }
}

const MAX_BUFFERED_METRICS = 200

function pushMetricToBuffer(metric: PerformanceMetricPayload) {
  const existing = window.__brewbrainPerformanceMetrics || []
  const nextMetrics = existing.length >= MAX_BUFFERED_METRICS
    ? [...existing.slice(existing.length - (MAX_BUFFERED_METRICS - 1)), metric]
    : [...existing, metric]

  window.__brewbrainPerformanceMetrics = nextMetrics
}

function sendMetric(metric: PerformanceMetricPayload) {
  if (!isPerformanceMonitoringEnabledOnClient()) {
    return
  }

  const endpoint = getPerformanceMonitoringEndpoint()
  const body = JSON.stringify(metric)

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body)
    return
  }

  void fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: {
      'content-type': 'application/json',
    },
  })
}

export function reportPerformanceMetric(
  metric: Omit<PerformanceMetricPayload, 'path' | 'timestamp'>
    & Partial<Pick<PerformanceMetricPayload, 'path' | 'timestamp'>>,
) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: PerformanceMetricPayload = {
    ...metric,
    path: metric.path || window.location.pathname,
    timestamp: metric.timestamp || Date.now(),
  }

  try {
    pushMetricToBuffer(payload)

    if (shouldLogPerformanceToConsole()) {
      console.info('[brewbrain:performance]', payload)
    }

    sendMetric(payload)
    window.dispatchEvent(new CustomEvent('brewbrain:performance-metric', { detail: payload }))
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[brewbrain:performance] failed to record metric', error)
    }
  }
}

export function getBufferedPerformanceMetrics() {
  if (typeof window === 'undefined') {
    return []
  }

  return window.__brewbrainPerformanceMetrics || []
}