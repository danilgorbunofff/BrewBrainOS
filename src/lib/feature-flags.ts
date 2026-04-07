const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

function isEnabled(value: string | undefined) {
  if (!value) {
    return false
  }

  return ENABLED_VALUES.has(value.toLowerCase())
}

export function isBenchmarkRouteEnabled() {
  return process.env.NODE_ENV !== 'production' || isEnabled(process.env.ENABLE_BENCHMARK_ROUTES)
}

export function isPerformanceMonitoringEnabledOnClient() {
  return process.env.NODE_ENV !== 'production' || isEnabled(process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING)
}

export function isPerformanceMonitoringEnabledOnServer() {
  return process.env.NODE_ENV !== 'production'
    || isEnabled(process.env.ENABLE_PERF_MONITORING)
    || isEnabled(process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING)
}

export function shouldLogPerformanceToConsole() {
  return process.env.NODE_ENV === 'development' || isEnabled(process.env.NEXT_PUBLIC_PERF_CONSOLE_LOGGING)
}

export function getPerformanceMonitoringEndpoint() {
  return process.env.NEXT_PUBLIC_PERFORMANCE_ENDPOINT || '/api/monitoring/performance'
}