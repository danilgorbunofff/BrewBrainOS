import '@/lib/sentry.server'

import { captureServerException, flushServerSentry } from '@/lib/sentry.server'

type Awaitable<T> = T | Promise<T>

type WithSentryOptions<TArgs extends unknown[]> = {
  flushTimeout?: number
  name?: string
  onError?: (error: unknown, ...args: TArgs) => Awaitable<Response>
  rethrow?: boolean
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.length > 0) {
    return error
  }

  return 'Internal Server Error'
}

export function withSentry<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Awaitable<Response>,
  options: WithSentryOptions<TArgs> = {},
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      captureServerException(error, { handler: options.name })
      await flushServerSentry(options.flushTimeout ?? 2000)

      if (options.onError) {
        return await options.onError(error, ...args)
      }

      if (options.rethrow) {
        throw error
      }

      return Response.json(
        { error: getErrorMessage(error) },
        { status: 500 },
      )
    }
  }
}

export function withSentryJson<TArgs extends unknown[], TPayload extends Record<string, unknown>>(
  handler: (...args: TArgs) => Awaitable<TPayload>,
  options: WithSentryOptions<TArgs> = {},
) {
  return withSentry(async (...args: TArgs) => Response.json(await handler(...args)), options)
}