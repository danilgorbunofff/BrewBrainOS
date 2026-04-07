import { NextRequest } from 'next/server'
import { logManualReading } from '@/app/(app)/batches/[id]/actions'
import { toSyncFailureResponse, toSyncSuccessResponse } from '@/app/api/sync-response'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result = await logManualReading(formData)

    if (result?.success) {
      return toSyncSuccessResponse()
    }

    return toSyncFailureResponse(result?.error || 'Failed to sync manual reading')
  } catch (error: unknown) {
    return toSyncFailureResponse(
      error instanceof Error ? error.message : String(error) || 'Failed to sync manual reading',
      503,
    )
  }
}