'use server'

import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { sanitizeDbError } from '@/lib/utils'
import { ActionResult } from '@/types/database'

const ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
]
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ATTACHMENT_BUCKET = 'feedback-attachments'

const feedbackSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message is too long'),
  url: z.string().url('Invalid URL').max(500).optional().or(z.literal('')).optional(),
  category: z.enum(['Bug', 'Suggestion', 'Other']).optional(),
})

export async function submitFeedback(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const parsed = feedbackSchema.safeParse({
      message: formData.get('message'),
      url: formData.get('url') ?? undefined,
      category: formData.get('category') ?? undefined,
    })

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { message, url, category } = parsed.data

    // ── Optional attachment ──────────────────────────────────────────
    let attachmentPath: string | null = null
    let attachmentName: string | null = null
    let attachmentType: string | null = null
    let attachmentSize: number | null = null

    const rawFile = formData.get('attachment')
    if (rawFile instanceof File && rawFile.size > 0) {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(rawFile.type)) {
        return { success: false, error: 'Attachment type not supported. Use PNG, JPG, GIF, WebP or PDF.' }
      }
      if (rawFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return { success: false, error: 'Attachment must be smaller than 5 MB.' }
      }

      const ext = rawFile.name.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'bin'
      const storagePath = `${user.id}/${randomUUID()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, rawFile, { contentType: rawFile.type, upsert: false })

      if (storageError) {
        console.error('Feedback attachment upload error:', storageError)
        return { success: false, error: 'Could not upload attachment. Please try without a file, or try again.' }
      }

      attachmentPath = storagePath
      attachmentName = rawFile.name.slice(0, 255)
      attachmentType = rawFile.type
      attachmentSize = rawFile.size
    }
    // ────────────────────────────────────────────────────────────────

    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        message,
        url: url || null,
        category: category ?? null,
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        attachment_size: attachmentSize,
      })

    if (error) {
      // Clean up orphaned storage file if the DB insert failed
      if (attachmentPath) {
        await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachmentPath])
      }
      // If the feedback table isn't created yet during the rollout, gracefully fail
      if (error.code === '42P01') {
        console.warn('Feedback table does not exist. Please run the schema update.')
        return { success: true, data: null }
      }
      console.error('Feedback insert error:', error)
      return { success: false, error: 'Could not save feedback. Please try again.' }
    }

    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'submitFeedback') }
  }
}
