'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { sanitizeDbError } from '@/lib/utils'
import { ActionResult } from '@/types/database'

const feedbackSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message is too long'),
  url: z.string().url('Invalid URL').max(500).optional().or(z.literal('')).optional(),
})

export async function submitFeedback(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const parsed = feedbackSchema.safeParse({
      message: formData.get('message'),
      url: formData.get('url') ?? undefined,
    })

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { message, url } = parsed.data

    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        message,
        url: url || null,
      })

    if (error) {
      // If the feedback table isn't created yet during the rollout, gracefully fail
      if (error.code === '42P01') {
        console.warn('Feedback table does not exist. Please run the schema update.')
        return { success: true, data: null } // Pretend it worked for the user
      }
      console.error('Feedback insert error:', error)
      return { success: false, error: 'Could not save feedback. Please try again.' }
    }

    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: sanitizeDbError(e, 'submitFeedback') }
  }
}
