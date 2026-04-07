'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function processVoiceLog(formData: FormData) {
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
    
    // We optionally pass a tankId if we triggered this directly from a tank's page.
    const tankId = formData.get('tankId') as string | null

    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    // Clean mimeType formatting for Gemini (e.g. audio/webm;codecs=opus -> audio/webm)
    const mimeType = audioFile.type.split(';')[0] || 'audio/webm'

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
        "temperature": {type: float, description: "the temperature if mentioned in fahrenheit or celsius"},
        "gravity": {type: float, description: "the final/current gravity e.g. 1.050 or 1.012"},
        "batch_id": {type: string, description: "the batch number or name if mentioned"},
        "notes": {type: string, description: "a concise summary of any other details"}
      }
      If a metric is not mentioned in the audio, set its value to null.
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
    
    // Parse the JSON reliably, Gemini follows the JSON MIME type config strictly in 1.5.
    let extractedData
    try {
      extractedData = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse Gemini output:', responseText)
      return { success: false, error: 'AI failed to extract structured data from speech.' }
    }
    
    // We attempt to find the proper batch ID
    let finalBatchId = null

    // If we're on a specific tank page, we can just grab that tank's current batch safely!
    if (tankId) {
      const { data: tankInfo } = await supabase.from('tanks').select('current_batch_id').eq('id', tankId).single()
      if (tankInfo?.current_batch_id) {
        finalBatchId = tankInfo.current_batch_id
      }
    } else if (extractedData.batch_id) {
       // Search by recipe name or ID if spoken (This requires more complex lookup logic, but we make a best effort)
       const { data: possibleBatch } = await supabase.from('batches').select('id').ilike('recipe_name', `%${extractedData.batch_id}%`).limit(1).single()
       if (possibleBatch) finalBatchId = possibleBatch.id
    }

    if (!finalBatchId) {
       return { 
         success: false, 
         error: tankId 
           ? "This tank has no active batch assigned. Go to the Tanks page and assign a batch first."
           : "Could not link reading to a batch. Try logging from your tank's page, or mention the exact recipe name.",
         data: extractedData 
       }
    }

    // Insert Reading
    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    const { error: insertError } = await supabase.from('batch_readings').insert({
      batch_id: finalBatchId,
      logger_id: user.id,
      temperature: extractedData.temperature || null,
      gravity: extractedData.gravity || null,
      notes: extractedData.notes || 'No notes.',
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })

    if (insertError) {
      throw insertError
    }

    // Also heavily optionally update the main 'batches' table with the newest gravity (fg)
    if (extractedData.gravity) {
       await supabase.from('batches').update({ fg: extractedData.gravity }).eq('id', finalBatchId)
    }

    if (tankId) revalidatePath(`/tank/${tankId}`)
    revalidatePath('/dashboard')

    return { success: true, message: 'Log safely recorded to database.', data: extractedData }
  } catch (error: unknown) {
    console.error('Process Voice Log Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }
  }
}
