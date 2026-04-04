'use server'

import { createClient } from '@/utils/supabase/server'
import { ActionResult } from '@/types/database'

export async function submitFeedback(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const message = formData.get('message') as string
    const url = formData.get('url') as string

    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message is required' }
    }

    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        message,
        url,
      })

    if (error) {
      // If the feedback table isn't created yet during the rollout, gracefully fail
      if (error.code === '42P01') {
        console.warn('Feedback table does not exist. Please run the schema update.')
        return { success: true, data: null } // Pretend it worked for the user
      }
      return { success: false, error: 'Database error while saving feedback' }
    }

    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message || 'Server error' }
  }
}
