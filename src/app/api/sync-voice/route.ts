import { NextRequest } from 'next/server'
import { processVoiceLog } from '@/app/actions/voice'
import { toSyncFailureResponse, toSyncSuccessResponse } from '@/app/api/sync-response'
import { withSentry } from '@/lib/with-sentry'

export const POST = withSentry(async (req: NextRequest) => {
  const formData = await req.formData()
  const result = await processVoiceLog(formData)

  if (result && result.success) {
    return toSyncSuccessResponse()
  }

  return toSyncFailureResponse(result?.error || 'Failed to sync voice log')
}, {
  name: 'api/sync-voice',
  onError: (error) => toSyncFailureResponse(
    error instanceof Error ? error.message : String(error) || 'Failed to sync voice log',
    503,
  ),
})
