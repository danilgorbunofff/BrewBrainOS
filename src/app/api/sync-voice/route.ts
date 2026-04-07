import { NextRequest, NextResponse } from 'next/server'
import { processVoiceLog } from '@/app/actions/voice'
import { toSyncFailureResponse, toSyncSuccessResponse } from '@/app/api/sync-response'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result = await processVoiceLog(formData)
    
    if (result && result.success) {
      return toSyncSuccessResponse()
    }

    return toSyncFailureResponse(result?.error || 'Failed to sync voice log')
  } catch (error: unknown) {
    return toSyncFailureResponse(
      error instanceof Error ? error.message : String(error) || 'Failed to sync voice log',
      503,
    )
  }
}
