import { NextResponse } from 'next/server'
import { isPerformanceMonitoringEnabledOnServer } from '@/lib/feature-flags'
import { withSentry } from '@/lib/with-sentry'

const MAX_PAYLOAD_SIZE = 10_000

function isValidMetricPayload(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false
  if (Array.isArray(payload)) return payload.length <= 50
  return JSON.stringify(payload).length <= MAX_PAYLOAD_SIZE
}

export const POST = withSentry(async (request: Request) => {
  if (!isPerformanceMonitoringEnabledOnServer()) {
    return new NextResponse(null, { status: 204 })
  }

  const payload: unknown = await request.json()

  if (!isValidMetricPayload(payload)) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
  }

  if (process.env.NODE_ENV !== 'test') {
    console.info('[brewbrain:performance:ingest]', JSON.stringify(payload))
  }

  return new NextResponse(null, { status: 204 })
}, {
  name: 'api/monitoring/performance',
  onError: (error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[brewbrain:performance:ingest] failed', error)
    }

    return NextResponse.json({ success: false }, { status: 400 })
  },
})