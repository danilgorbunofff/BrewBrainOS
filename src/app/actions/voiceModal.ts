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

/**
 * Step 1: Transcribe audio and extract structured data via AI.
 * Does NOT save to database — returns data for user confirmation.
 */
export async function transcribeVoiceLog(formData: FormData) {
  try {
    const { brewery } = await requireActiveBrewery()

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

    const extractedData = await transcribeWithGemini(audioFile, { includeTranscript: true })

    return { success: true, data: extractedData }
  } catch (error: unknown) {
    console.error('Transcribe Voice Log Error:', error)
    return { success: false, error: sanitizeDbError(error, 'transcribeVoiceLog') }
  }
}

/**
 * Step 2: Save confirmed voice log data to the database.
 */
export async function saveVoiceLog(data: {
  temperature: number | null
  gravity: number | null
  notes: string | null
  batch_id: string | null
  tankId?: string | null
  external_id?: string | null
}) {
  try {
    const { supabase, user, brewery } = await requireActiveBrewery()

    const tier = (brewery.subscription_tier || 'free') as TierSlug
    if (!canUseTierFeature(tier, 'aiVoiceLogs')) {
      return { success: false, error: 'AI Voice Logs require a Production or higher plan.' }
    }

    const { batchId: finalBatchId, error: batchError } = await resolveBatchId(
      supabase,
      brewery.id,
      { tankId: data.tankId, spokenBatchId: data.batch_id }
    )

    if (!finalBatchId) {
      return { success: false, error: batchError }
    }

    const { deduped } = await insertBatchReading(supabase, {
      batchId: finalBatchId,
      userId: user.id,
      temperature: data.temperature,
      gravity: data.gravity,
      notes: data.notes,
      externalId: data.external_id?.trim() || null,
    })

    if (deduped) {
      return { success: true, message: 'Log already recorded.', deduped: true }
    }

    if (data.tankId) revalidatePath(`/tank/${data.tankId}`)
    revalidatePath('/dashboard')

    return { success: true, message: 'Log safely recorded to database.' }
  } catch (error: unknown) {
    console.error('Save Voice Log Error:', error)
    return { success: false, error: sanitizeDbError(error, 'saveVoiceLog') }
  }
}
