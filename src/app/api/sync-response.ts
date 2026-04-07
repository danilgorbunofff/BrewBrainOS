import { NextResponse } from 'next/server'

function inferSyncStatus(error: string) {
  if (/unauthorized/i.test(error)) {
    return 401
  }

  if (/no brewery found/i.test(error)) {
    return 403
  }

  if (/network|timeout|temporar|rate limit/i.test(error)) {
    return 503
  }

  return 400
}

function isRetryableStatus(status: number) {
  return status === 401
    || status === 403
    || status === 408
    || status === 425
    || status === 429
    || status >= 500
}

export function toSyncFailureResponse(error: string, status = inferSyncStatus(error)) {
  return NextResponse.json(
    {
      success: false,
      error,
      retryable: isRetryableStatus(status),
    },
    { status },
  )
}

export function toSyncSuccessResponse() {
  return NextResponse.json({ success: true })
}