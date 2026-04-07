'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'
import { sanitizeDbError } from '@/lib/utils'

const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Step 1: Transcribe audio and extract structured data via AI.
 * Does NOT save to database — returns data for user confirmation.
 */
export async function transcribeVoiceLog(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const audioFile = formData.get('audio') as File | null
    if (!audioFile) {
      return { success: false, error: 'No audio provided.' }
    }

    const baseMime = audioFile.type.split(';')[0]
    if (!ALLOWED_AUDIO_TYPES.includes(baseMime)) {
      return { success: false, error: 'Unsupported audio format.' }
    }
    if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return { success: false, error: 'Audio file is too large (max 10 MB).' }
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = baseMime || 'audio/webm'

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })

    const prompt = `
      You are an expert brewery production assistant.
      Listen to the brewer's audio log and extract the following metrics.
      You MUST output ONLY valid JSON containing EXACTLY these keys:
      {
        "transcript": {type: string, description: "the full transcription of what was spoken"},
        "temperature": {type: float, description: "the temperature if mentioned in fahrenheit or celsius"},
        "gravity": {type: float, description: "the final/current gravity e.g. 1.050 or 1.012"},
        "batch_id": {type: string, description: "the batch number or name if mentioned"},
        "notes": {type: string, description: "a concise summary of any other details"}
      }
      If a metric is not mentioned in the audio, set its value to null.
      The transcript should be the exact words spoken, not a summary.
      CRITICAL: Return ONLY the JSON object, do not wrap in markdown tags like \`\`\`json.
    `

    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ])

    const responseText = response.response.text()
    
    let extractedData
    try {
      extractedData = JSON.parse(responseText)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.error('Failed to parse Gemini output:', responseText)
      return { success: false, error: 'AI failed to extract structured data from speech.' }
    }

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
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    let finalBatchId = null

    if (data.tankId) {
      const { data: tankInfo } = await supabase.from('tanks').select('current_batch_id').eq('id', data.tankId).single()
      if (tankInfo?.current_batch_id) {
        finalBatchId = tankInfo.current_batch_id
      }
    } else if (data.batch_id) {
      const { data: possibleBatch } = await supabase.from('batches').select('id').ilike('recipe_name', `%${data.batch_id}%`).limit(1).single()
      if (possibleBatch) finalBatchId = possibleBatch.id
    }

    if (!finalBatchId) {
      return { 
        success: false, 
        error: data.tankId
          ? "This tank has no active batch assigned."
          : "Could not link reading to a batch. Try logging from your tank's page, or mention the exact recipe name.",
      }
    }

    const { error: insertError } = await supabase.from('batch_readings').insert({
      batch_id: finalBatchId,
      logger_id: user.id,
      temperature: data.temperature || null,
      gravity: data.gravity || null,
      notes: data.notes || 'No notes.'
    })

    if (insertError) throw insertError

    if (data.gravity) {
      await supabase.from('batches').update({ fg: data.gravity }).eq('id', finalBatchId)
    }

    if (data.tankId) revalidatePath(`/tank/${data.tankId}`)
    revalidatePath('/dashboard')

    return { success: true, message: 'Log safely recorded to database.' }
  } catch (error: unknown) {
    console.error('Save Voice Log Error:', error)
    return { success: false, error: sanitizeDbError(error, 'saveVoiceLog') }
  }
}
