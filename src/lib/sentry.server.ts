import * as Sentry from '@sentry/nextjs'

const DEFAULT_TRACES_SAMPLE_RATE = 0.1

let initialized = false

function getServerSentryDsn() {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
}

function getTracesSampleRate() {
  const value = Number(process.env.SENTRY_TRACES_SAMPLE_RATE)

  if (Number.isFinite(value) && value >= 0) {
    return value
  }

  return DEFAULT_TRACES_SAMPLE_RATE
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error('Unknown server error')
}

export function isServerSentryEnabled() {
  return Boolean(getServerSentryDsn())
}

export function initializeServerSentry() {
  if (initialized || !isServerSentryEnabled()) {
    return
  }

  Sentry.init({
    dsn: getServerSentryDsn(),
    enabled: true,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: getTracesSampleRate(),
  })

  initialized = true
}

export function captureServerException(
  error: unknown,
  options?: {
    handler?: string
    extras?: Record<string, unknown>
  },
) {
  if (!isServerSentryEnabled()) {
    return
  }

  initializeServerSentry()

  if (options?.handler || options?.extras) {
    Sentry.withScope((scope) => {
      if (options.handler) {
        scope.setTag('handler', options.handler)
      }

      if (options.extras) {
        for (const [key, value] of Object.entries(options.extras)) {
          scope.setExtra(key, value)
        }
      }

      Sentry.captureException(normalizeError(error))
    })

    return
  }

  Sentry.captureException(normalizeError(error))
}

export async function flushServerSentry(timeout = 2000) {
  if (!isServerSentryEnabled()) {
    return
  }

  initializeServerSentry()
  await Sentry.flush(timeout)
}

initializeServerSentry()