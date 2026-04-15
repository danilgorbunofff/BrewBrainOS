'use server'

import { requireActiveBrewery } from '@/lib/require-brewery'
import { canUseTierFeature } from '@/lib/tier-config'
import { TierSlug } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { sanitizeDbError } from '@/lib/utils'
import {
  validateAudioFile,
  transcribeWithGemini,
  resolveBatchId,
  insertBatchReading,
} from '@/lib/voice-log'

export async function processVoiceLog(formData: FormData) {
  try {
    const { supabase, user, brewery } = await requireActiveBrewery()

    const tier = (brewery.subscription_tier || 'free') as TierSlug
    if (!canUseTierFeature(tier, 'aiVoiceLogs')) {
      return { success: false, error: 'AI Voice Logs require a Production or higher plan.' }
    }

    const audioFile = formData.get('audio') as File | null
    if (!audioFile) {
      return { success: false, error: 'No audio provided.' }
    }

    const validationError = validateAudioFile(audioFile)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const tankId = formData.get('tankId') as string | null

    const extractedData = await transcribeWithGemini(audioFile)

    const { batchId: finalBatchId, error: batchError } = await resolveBatchId(
      supabase,
      brewery.id,
      { tankId, spokenBatchId: extractedData.batch_id }
    )

    if (!finalBatchId) {
      return { success: false, error: batchError, data: extractedData }
    }

    const externalId = (formData.get('external_id') as string | null)?.trim() || null

    const { deduped } = await insertBatchReading(supabase, {
      batchId: finalBatchId,
      userId: user.id,
      temperature: extractedData.temperature,
      gravity: extractedData.gravity,
      notes: extractedData.notes,
      externalId,
    })

    if (deduped) {
      return {
        success: true,
        message: 'Log already recorded.',
        data: extractedData,
        deduped: true,
      }
    }

    if (tankId) revalidatePath(`/tank/${tankId}`)
    revalidatePath('/dashboard')

    return { success: true, message: 'Log safely recorded to database.', data: extractedData }
  } catch (error: unknown) {
    console.error('Process Voice Log Error:', error)
    return { success: false, error: sanitizeDbError(error, 'processVoiceLog') }
  }
}
