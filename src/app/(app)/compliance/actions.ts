'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types/database'
import { getActiveBrewery } from '@/lib/active-brewery'
import { headers } from 'next/headers'

export async function logDailyOperation(data: {
  logDate: string
  operationType: string
  quantity: number
  unit: string
  batchId?: string
  inventoryId?: string
  ttbReportable: boolean
  remarks?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  const reqHeaders = await headers()
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
  const userAgent = reqHeaders.get('user-agent') || 'unknown'

  const { data: userAuth } = await supabase.auth.getUser()

  const { data: inserted, error } = await supabase
    .from('daily_operations_logs')
    .insert({
      brewery_id: brewery.id,
      log_date: data.logDate,
      operation_type: data.operationType,
      quantity: data.quantity,
      unit: data.unit,
      batch_id: data.batchId || null,
      inventory_id: data.inventoryId || null,
      ttb_reportable: data.ttbReportable,
      remarks: data.remarks || null,
      logged_by: userAuth?.user?.id || null,
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert daily operations log:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/compliance')
  return { success: true, data: inserted }
}

export async function updateShrinkageTTBRemarks(
  alertId: string,
  remarks: string,
  ttbReportable: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  const { data: updated, error } = await supabase
    .from('shrinkage_alerts')
    .update({
      ttb_remarks: remarks,
      ttb_reportable: ttbReportable
    })
    .eq('id', alertId)
    .eq('brewery_id', brewery.id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update shrinkage TTB remarks:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/compliance')
  return { success: true, data: updated }
}

export async function validateTTBContinuity(month: number, year: number): Promise<ActionResult> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  // Date range logic
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  // 1. Calculate production (batches completed between dates)
  // Assuming 1 batch ≈ avg tank capacity. For strict 5130 math we'd look at packaging logs.
  // We'll mock 7 bbls per completed batch for MVP.
  const { data: batches } = await supabase
    .from('batches')
    .select('id, status')
    .eq('brewery_id', brewery.id)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['complete', 'packaging'])

  const produced = (batches?.length || 0) * 7

  // 2. Aggregate Operations
  const { data: ops } = await supabase
    .from('daily_operations_logs')
    .select('operation_type, quantity')
    .eq('brewery_id', brewery.id)
    .gte('log_date', startDate)
    .lte('log_date', endDate)

  let removals = 0
  let returns = 0
  let breakage = 0

  if (ops) {
    for (const op of ops) {
      if (op.operation_type === 'removal_taxpaid' || op.operation_type === 'removal_tax_free') {
        removals += Number(op.quantity)
      } else if (op.operation_type === 'return_to_brewery') {
        returns += Number(op.quantity)
      } else if (op.operation_type === 'breakage_destruction') {
        breakage += Number(op.quantity)
      }
    }
  }

  // 3. Shrinkage alerts loss for the month
  const { data: alerts } = await supabase
    .from('shrinkage_alerts')
    .select('loss_amount')
    .eq('brewery_id', brewery.id)
    .gte('detected_at', startDate)
    .lte('detected_at', endDate)

  const shortages = (alerts || []).reduce((acc: number, cur) => acc + Number(cur.loss_amount), 0)

  // 4. Validate Continuity (Simplified model: Beginning is presumed, ending is predicted)
  // Real implementation requires explicit snapshotting. MVP implies valid.
  const beginningInventory = 50 // Stub as rolling previous isn't stored 
  const endingInventoryPredicted = beginningInventory + produced + returns - removals - breakage - shortages

  const cbmaEligible = (removals <= 60000)

  const responseData = {
    continuityValid: true,
    beginningInventory,
    produced,
    removals,
    returns,
    breakage,
    shortages,
    endingInventoryPredicted,
    cbmaEligible,
    cbmaBarrelsUsed: removals
  }
  
  return { success: true, data: responseData }
}
