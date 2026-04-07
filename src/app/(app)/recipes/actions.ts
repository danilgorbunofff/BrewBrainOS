'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types/database'
import { getActiveBrewery } from '@/lib/active-brewery'
import { headers } from 'next/headers'

export async function createRecipe(data: {
  name: string
  style: string
  batch_size_bbls: number
  target_og: number
  target_fg: number
  target_ibu: number
  target_abv: number
}): Promise<ActionResult> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({ brewery_id: brewery.id, ...data })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/recipes')
  return { success: true, data: recipe }
}

export async function addRecipeIngredient(
  recipeId: string,
  data: {
    inventory_item_id?: string
    ingredient_type: string
    amount: number
    unit: string
    timing?: string
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { data: ingredient, error } = await supabase
    .from('recipe_ingredients')
    .insert({ recipe_id: recipeId, ...data })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, data: ingredient }
}

export async function logBrewingMetrics(
  batchId: string,
  data: {
    mashing_ph: number
    boil_off_rate_pct: number
    water_chemistry_notes: string
    actual_ibu_calculated?: number
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  const reqHeaders = await headers()
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
  const userAgent = reqHeaders.get('user-agent') || 'unknown'

  const { data: log, error } = await supabase
    .from('batch_brewing_logs')
    .insert({
      batch_id: batchId,
      brewery_id: brewery.id,
      log_type: 'brew_day',
      provenance_ip: ip,
      provenance_user_agent: userAgent,
      ...data
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(`/batches/${batchId}`)
  return { success: true, data: log }
}
