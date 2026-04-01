'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'

export async function addInventoryItem(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const item_type = formData.get('item_type') as string
  const name = formData.get('name') as string
  const current_stock = parseFloat(formData.get('current_stock') as string)
  const unit = formData.get('unit') as string
  const reorder_point = parseFloat(formData.get('reorder_point') as string)

  const { error } = await supabase
    .from('inventory')
    .insert({
      brewery_id: brewery.id,
      item_type,
      name,
      current_stock,
      unit,
      reorder_point
    })

  if (error) {
    console.error('Add inventory error:', error)
    throw new Error('Failed to add inventory item.')
  }

  revalidatePath('/inventory')
}

export async function adjustStock(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const id = formData.get('id') as string
  const adjustment = parseFloat(formData.get('adjustment') as string)

  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory')
    .select('current_stock')
    .eq('id', id)
    .eq('brewery_id', brewery.id) // ownership gate
    .single()

  if (fetchError || !currentItem) throw new Error('Item not found or access denied')

  const newStock = Math.max(0, currentItem.current_stock + adjustment)

  const { error: updateError } = await supabase
    .from('inventory')
    .update({ current_stock: newStock })
    .eq('id', id)

  if (updateError) {
    console.error('Adjust stock error:', updateError)
    throw new Error('Failed to adjust stock')
  }

  revalidatePath('/inventory')
}

export async function deleteInventoryItem(formData: FormData) {
  const { supabase, brewery } = await requireActiveBrewery()

  const itemId = formData.get('itemId') as string

  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId)
    .eq('brewery_id', brewery.id)

  if (error) {
    console.error('Failed to delete inventory item:', error)
    throw new Error('Failed to delete inventory item')
  }

  revalidatePath('/inventory')
}
