'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logSanitation(formData: FormData) {
  const supabase = await createClient()
  
  const tankId = formData.get('tankId') as string
  const notes = formData.get('notes') as string || 'Routine cleaning'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('sanitation_logs')
    .insert({
      tank_id: tankId,
      user_id: user.id,
      notes: notes
    })

  if (error) {
    console.error('Failed to log sanitation:', error)
    throw new Error('Database Error: Failed to log sanitation.')
  }

  revalidatePath(`/tank/${tankId}`)
}
