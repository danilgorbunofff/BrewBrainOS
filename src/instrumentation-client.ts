import { reportPerformanceMetric } from '@/lib/performance-monitoring'

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

  window.addEventListener('error', (event) => {
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