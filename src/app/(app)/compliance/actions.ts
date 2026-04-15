'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResult, DailyOperationType } from '@/types/database'
import { getActiveBrewery } from '@/lib/active-brewery'
import { headers } from 'next/headers'

interface TTBContinuityValidation {
  continuityValid: boolean
  beginningInventory: number
  produced: number
  removals: number
  returns: number
  breakage: number
  shortages: number
  endingInventoryPredicted: number
  cbmaEligible: boolean
  cbmaBarrelsUsed: number
}

const VALID_OPERATION_TYPES: DailyOperationType[] = [
  'removal_taxpaid',
  'removal_tax_free',
  'return_to_brewery',
  'breakage_destruction',
  'other',
]

/** Convert a quantity to BBL based on unit */
function toBBL(quantity: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'gal':
    case 'gallons':
      return quantity / 31
    case 'l':
    case 'liters':
    case 'litres':
      return quantity / 117.348
    case 'bbl':
    case 'barrels':
    default:
      return quantity
  }
}

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

  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth?.user) return { success: false, error: 'Unauthorized.' }

  // Validate operation type
  if (!VALID_OPERATION_TYPES.includes(data.operationType as DailyOperationType)) {
    return { success: false, error: `Invalid operation type: ${data.operationType}` }
  }

  // Validate quantity is positive
  if (data.quantity <= 0) {
    return { success: false, error: 'Quantity must be a positive number.' }
  }

  const reqHeaders = await headers()
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
  const userAgent = reqHeaders.get('user-agent') || 'unknown'

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
      logged_by: userAuth.user.id,
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

export async function validateTTBContinuity(month: number, year: number): Promise<ActionResult<TTBContinuityValidation>> {
  const supabase = await createClient()
  const brewery = await getActiveBrewery()
  if (!brewery) return { success: false, error: 'No active brewery found.' }

  // Date range logic for specified month
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  // Fetch average tank capacity for this brewery
  const { data: tanks } = await supabase
    .from('tanks')
    .select('capacity')
    .eq('brewery_id', brewery.id)

  const avgTankCapacity = tanks && tanks.length > 0
    ? tanks.reduce((sum, t) => sum + (Number(t.capacity) || 7), 0) / tanks.length
    : 7

  // 1. Calculate production (batches completed in this period)
  const { data: batches } = await supabase
    .from('batches')
    .select('id, status')
    .eq('brewery_id', brewery.id)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .in('status', ['complete', 'packaging'])

  const produced = (batches?.length || 0) * avgTankCapacity

  // 2. Aggregate daily operations with unit conversion to BBL
  const { data: ops } = await supabase
    .from('daily_operations_logs')
    .select('operation_type, quantity, unit')
    .eq('brewery_id', brewery.id)
    .gte('log_date', startDate)
    .lte('log_date', endDate)

  let removals = 0
  let returns = 0
  let breakage = 0

  if (ops) {
    for (const op of ops) {
      const qtyBBL = toBBL(Number(op.quantity), op.unit)
      if (op.operation_type === 'removal_taxpaid' || op.operation_type === 'removal_tax_free') {
        removals += qtyBBL
      } else if (op.operation_type === 'return_to_brewery') {
        returns += qtyBBL
      } else if (op.operation_type === 'breakage_destruction') {
        breakage += qtyBBL
      }
    }
  }

  // 3. Shrinkage alerts loss for the month (loss_amount is in item units, not BBL — tracked as-is)
  const { data: alerts } = await supabase
    .from('shrinkage_alerts')
    .select('loss_amount')
    .eq('brewery_id', brewery.id)
    .eq('ttb_reportable', true)
    .gte('detected_at', startDate)
    .lte('detected_at', endDate)

  const shortages = (alerts || []).reduce((acc: number, cur) => acc + Number(cur.loss_amount), 0)

  // 4. Compute beginning inventory from prior month's ending
  // Derive from all prior operations to avoid hardcoded stub
  const { data: priorOps } = await supabase
    .from('daily_operations_logs')
    .select('operation_type, quantity, unit')
    .eq('brewery_id', brewery.id)
    .lt('log_date', startDate)

  const { data: priorBatches } = await supabase
    .from('batches')
    .select('id')
    .eq('brewery_id', brewery.id)
    .lt('created_at', startDate)
    .in('status', ['complete', 'packaging'])

  const { data: priorAlerts } = await supabase
    .from('shrinkage_alerts')
    .select('loss_amount')
    .eq('brewery_id', brewery.id)
    .eq('ttb_reportable', true)
    .lt('detected_at', startDate)

  let priorRemovals = 0
  let priorReturns = 0
  let priorBreakage = 0
  if (priorOps) {
    for (const op of priorOps) {
      const qtyBBL = toBBL(Number(op.quantity), op.unit)
      if (op.operation_type === 'removal_taxpaid' || op.operation_type === 'removal_tax_free') {
        priorRemovals += qtyBBL
      } else if (op.operation_type === 'return_to_brewery') {
        priorReturns += qtyBBL
      } else if (op.operation_type === 'breakage_destruction') {
        priorBreakage += qtyBBL
      }
    }
  }
  const priorProduced = (priorBatches?.length || 0) * avgTankCapacity
  const priorShortages = (priorAlerts || []).reduce((acc: number, cur) => acc + Number(cur.loss_amount), 0)

  // Beginning = initial stock (0 for new breweries) + all prior production + returns - removals - breakage - shortages
  const beginningInventory = Math.max(0, priorProduced + priorReturns - priorRemovals - priorBreakage - priorShortages)

  const endingInventoryPredicted = beginningInventory + produced + returns - removals - breakage - shortages

  // 5. CBMA eligibility — threshold is 60,000 BBL annual removals
  const yearStartDate = new Date(year, 0, 1).toISOString()
  const yearEndDate = new Date(year, 11, 31, 23, 59, 59).toISOString()
  const { data: annualOps } = await supabase
    .from('daily_operations_logs')
    .select('operation_type, quantity, unit')
    .eq('brewery_id', brewery.id)
    .in('operation_type', ['removal_taxpaid', 'removal_tax_free'])
    .gte('log_date', yearStartDate)
    .lte('log_date', yearEndDate)

  const annualRemovals = (annualOps || []).reduce((acc, op) => acc + toBBL(Number(op.quantity), op.unit), 0)
  const cbmaEligible = annualRemovals <= 60000

  const responseData: TTBContinuityValidation = {
    continuityValid: endingInventoryPredicted >= 0,
    beginningInventory: Math.round(beginningInventory * 100) / 100,
    produced: Math.round(produced * 100) / 100,
    removals: Math.round(removals * 100) / 100,
    returns: Math.round(returns * 100) / 100,
    breakage: Math.round(breakage * 100) / 100,
    shortages: Math.round(shortages * 100) / 100,
    endingInventoryPredicted: Math.round(endingInventoryPredicted * 100) / 100,
    cbmaEligible,
    cbmaBarrelsUsed: Math.round(annualRemovals * 100) / 100,
  }
  
  return { success: true, data: responseData }
}
