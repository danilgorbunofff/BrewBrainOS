'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { setActiveBreweryId } from '@/lib/active-brewery'
import { brewerySchema } from '@/lib/schemas'
import { ActionResult } from '@/types/database'

export async function setupBrewery(formData: FormData): Promise<ActionResult | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized: Please log in again.' }
  }

  const rawData = {
    name: formData.get('name') as string,
  }

  const result = brewerySchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const { data: newBrewery, error } = await supabase
    .from('breweries')
    .insert({
      name: result.data.name.trim(),
      owner_id: user.id
    })
    .select('id')
    .maybeSingle()

  if (error || !newBrewery) {
    console.error('Failed to setup brewery:', error)
    return { success: false, error: error?.message || 'Database Error: Could not create brewery.' }
  }

  // Automatically set the new brewery as active
  await setActiveBreweryId(newBrewery.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
