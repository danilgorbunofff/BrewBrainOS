import * as Sentry from '@sentry/nextjs'
import { reportPerformanceMetric } from '@/lib/performance-monitoring'

const DEFAULT_CLIENT_TRACES_SAMPLE_RATE = 0.1

let clientSentryInitialized = false

function getClientTracesSampleRate() {
  const value = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)

  if (Number.isFinite(value) && value >= 0) {
    return value
  }

  return DEFAULT_CLIENT_TRACES_SAMPLE_RATE
}

function initializeClientSentry() {
  if (clientSentryInitialized || typeof window === 'undefined' || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: getClientTracesSampleRate(),
  })

  clientSentryInitialized = true
}

function getErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  return { message: 'Unknown client error' }
}

try {
  performance.mark('brewbrain:app-init')
  initializeClientSentry()

  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error || new Error(event.message || 'Unhandled window error'))

    reportPerformanceMetric({
      category: 'client-error',
      name: 'window-error',
      value: 1,
      unit: 'count',
      detail: {
        ...getErrorDetail(event.error || event.message),
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(getErrorDetail(event.reason).message))

    reportPerformanceMetric({
      category: 'client-error',
      name: 'unhandled-rejection',
      value: 1,
      unit: 'count',
      detail: getErrorDetail(event.reason),
    })
  })

  if ('PerformanceObserver' in window) {
    const supportedEntryTypes = PerformanceObserver.supportedEntryTypes || []
    const entryTypes = ['navigation', 'paint', 'longtask'].filter((entryType) => supportedEntryTypes.includes(entryType))

    if (entryTypes.length > 0) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            reportPerformanceMetric({
              category: 'paint',
              name: entry.name,
              value: entry.startTime,
              unit: 'ms',
            })
          }

          if (entry.entryType === 'navigation') {
            const navigationEntry = entry as PerformanceNavigationTiming

            reportPerformanceMetric({
              category: 'navigation',
              name: 'page-load',
              value: navigationEntry.loadEventEnd,
              unit: 'ms',
              detail: {
                domInteractive: navigationEntry.domInteractive,
                domContentLoaded: navigationEntry.domContentLoadedEventEnd,
                responseEnd: navigationEntry.responseEnd,
                type: navigationEntry.type,
              },
            })
          }

          if (entry.entryType === 'longtask') {
            reportPerformanceMetric({
              category: 'longtask',
              name: 'longtask',
              value: entry.duration,
              unit: 'ms',
            })
          }
        }
      })

      observer.observe({ entryTypes })
    }
  }
} catch (error) {
  Sentry.captureException(error)

  if (process.env.NODE_ENV === 'development') {
    console.error('[brewbrain:instrumentation-client] failed to initialize', error)
  }
}

export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse') {
  try {
    performance.mark(`brewbrain:navigation:start:${url}`)
  } catch {
    // Ignore performance mark failures.
  }

  reportPerformanceMetric({
    category: 'navigation',
    name: 'route-change-start',
    value: 0,
    unit: 'count',
    detail: {
      url,
      navigationType,
    },
  })
}