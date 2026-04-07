import { NextRequest } from 'next/server'
import { logManualReading } from '@/app/(app)/batches/[id]/actions'
import { toSyncFailureResponse, toSyncSuccessResponse } from '@/app/api/sync-response'
import { withSentry } from '@/lib/with-sentry'

export const POST = withSentry(async (req: NextRequest) => {
  const formData = await req.formData()
  const result = await logManualReading(formData)

  if (result?.success) {
    return toSyncSuccessResponse()
  }

  return toSyncFailureResponse(result?.error || 'Failed to sync manual reading')
}, {
  name: 'api/sync-manual-reading',
  onError: (error) => toSyncFailureResponse(
    error instanceof Error ? error.message : String(error) || 'Failed to sync manual reading',
    503,
  ),
})