import { GoogleGenerativeAI } from '@google/generative-ai'
import { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { isUniqueViolationFor } from '@/lib/utils'

export const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface VoiceExtractionResult {
  transcript?: string | null
  temperature: number | null
  gravity: number | null
  batch_id: string | null
  notes: string | null
}

/**
 * Validate an audio file (type + size).
 * Returns an error string or null if valid.
 */
export function validateAudioFile(file: File): string | null {
  const baseMime = file.type.split(';')[0]
  if (!ALLOWED_AUDIO_TYPES.includes(baseMime)) {
    return 'Unsupported audio format.'
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return 'Audio file is too large (max 10 MB).'
  }
  return null
}

/**
 * Transcribe audio via Gemini and extract structured data.
 * The `includeTranscript` flag adds a transcript field to the prompt (mobile flow).
 */
export async function transcribeWithGemini(
  audioFile: File,
  options?: { includeTranscript?: boolean }
): Promise<VoiceExtractionResult> {
  const baseMime = audioFile.type.split(';')[0] || 'audio/webm'
  const arrayBuffer = await audioFile.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const transcriptField = options?.includeTranscript
    ? `"transcript": {type: string, description: "the full transcription of what was spoken"},\n        `
    : ''

  const transcriptInstruction = options?.includeTranscript
    ? '\n      The transcript should be the exact words spoken, not a summary.'
    : ''

  const prompt = `
      You are an expert brewery production assistant.
      Listen to the brewer's audio log and extract the following metrics.
      You MUST output ONLY valid JSON containing EXACTLY these keys:
      {
        ${transcriptField}"temperature": {type: float, description: "the temperature if mentioned in fahrenheit or celsius"},
        "gravity": {type: float, description: "the final/current gravity e.g. 1.050 or 1.012"},
        "batch_id": {type: string, description: "the batch number or name if mentioned"},
        "notes": {type: string, description: "a concise summary of any other details"}
      }
      If a metric is not mentioned in the audio, set its value to null.${transcriptInstruction}
      CRITICAL: Return ONLY the JSON object, do not wrap in markdown tags like \`\`\`json.
    `

  const response = await model.generateContent([
    prompt,
    { inlineData: { mimeType: baseMime, data: base64Data } },
  ])

  const responseText = response.response.text()

  try {
    return JSON.parse(responseText) as VoiceExtractionResult
  } catch {
    console.error('Failed to parse Gemini output:', responseText)
    throw new Error('AI failed to extract structured data from speech.')
  }
}

/**
 * Resolve a batch ID from either a tankId or a spoken batch name.
 * All lookups are scoped to the given breweryId.
 */
export async function resolveBatchId(
  supabase: SupabaseClient,
  breweryId: string,
  opts: { tankId?: string | null; spokenBatchId?: string | null }
): Promise<{ batchId: string | null; error?: string }> {
  if (opts.tankId) {
    const { data: tankInfo } = await supabase
      .from('tanks')
      .select('current_batch_id')
      .eq('id', opts.tankId)
      .eq('brewery_id', breweryId)
      .single()

    if (tankInfo?.current_batch_id) {
      return { batchId: tankInfo.current_batch_id }
    }

    return {
      batchId: null,
      error: 'This tank has no active batch assigned. Go to the Tanks page and assign a batch first.',
    }
  }

  if (opts.spokenBatchId) {
    const { data: possibleBatch } = await supabase
      .from('batches')
      .select('id')
      .eq('brewery_id', breweryId)
      .ilike('recipe_name', `%${opts.spokenBatchId}%`)
      .limit(1)
      .single()

    if (possibleBatch) {
      return { batchId: possibleBatch.id }
    }
  }

  return {
    batchId: null,
    error: "Could not link reading to a batch. Try logging from your tank's page, or mention the exact recipe name.",
  }
}

/**
 * Insert a batch reading and optionally update the batch FG.
 * Returns `{ deduped: true }` if the external_id already exists.
 */
export async function insertBatchReading(
  supabase: SupabaseClient,
  opts: {
    batchId: string
    userId: string
    temperature: number | null
    gravity: number | null
    notes: string | null
    externalId?: string | null
    includeProvenance?: boolean
  }
): Promise<{ deduped?: boolean }> {
  const row: Record<string, unknown> = {
    batch_id: opts.batchId,
    logger_id: opts.userId,
    temperature: opts.temperature || null,
    gravity: opts.gravity || null,
    notes: opts.notes || 'No notes.',
  }

  if (opts.externalId) {
    row.external_id = opts.externalId
  }

  if (opts.includeProvenance !== false) {
    const reqHeaders = await headers()
    row.provenance_ip =
      reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    row.provenance_user_agent = reqHeaders.get('user-agent') || 'unknown'
  }

  const { error: insertError } = await supabase.from('batch_readings').insert(row)

  if (insertError) {
    if (isUniqueViolationFor(insertError, 'external_id')) {
      return { deduped: true }
    }
    throw insertError
  }

  // Update the batch's FG with the latest gravity
  if (opts.gravity) {
    await supabase.from('batches').update({ fg: opts.gravity }).eq('id', opts.batchId)
  }

  return {}
}
