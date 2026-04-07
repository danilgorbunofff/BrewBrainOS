import { NextResponse } from 'next/server'
import { isPerformanceMonitoringEnabledOnServer } from '@/lib/feature-flags'

export async function POST(request: Request) {
  try {
    if (!isPerformanceMonitoringEnabledOnServer()) {
      return new NextResponse(null, { status: 204 })
    }

    const payload = await request.json()

    if (process.env.NODE_ENV !== 'test') {
      console.info('[brewbrain:performance:ingest]', JSON.stringify(payload))
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[brewbrain:performance:ingest] failed', error)
    }

    return NextResponse.json({ success: false }, { status: 400 })
  }
}