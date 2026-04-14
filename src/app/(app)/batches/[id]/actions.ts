'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { ActionResult } from '@/types/database'
import { detectFermentationAlerts, BatchReadingInput, BatchConfig } from '@/lib/fermentation-alerts'
import { sendFermentationAlertNotification } from '@/app/actions/push-actions'
import { headers } from 'next/headers'
import { isUniqueViolationFor, sanitizeDbError } from '@/lib/utils'

// ─────────────────────────────────────────────
// EXISTING ACTIONS
// ─────────────────────────────────────────────

export async function updateBatchStatus(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const batchId = formData.get('batchId') as string
    const status = formData.get('status') as string

    if (!batchId) return { success: false, error: 'Batch ID is required' }

    const { error } = await supabase
      .from('batches')
      .update({ status })
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to update batch status:', error)
      return { success: false, error: 'Failed to update batch status' }
    }

    revalidatePath(`/batches/${batchId}`)
    revalidatePath('/batches')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
  }
}

export async function updateBatchFG(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    const batchId = formData.get('batchId') as string
    const fg = parseFloat(formData.get('fg') as string)

    if (!batchId) return { success: false, error: 'Batch ID is required' }
    if (isNaN(fg)) return { success: false, error: 'Invalid gravity value' }

    const { error } = await supabase
      .from('batches')
      .update({ fg })
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)

    if (error) {
      console.error('Failed to update final gravity:', error)
      return { success: false, error: 'Failed to update final gravity' }
    }

    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    // Also create a reading so it shows on the dashboard chart
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('batch_readings').insert({
      batch_id: batchId,
      gravity: fg,
      logger_id: user?.id,
      notes: 'Manual gravity log',
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })

    revalidatePath(`/batches/${batchId}`)
    revalidatePath('/batches')
    revalidatePath('/dashboard')
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
  }
}

// ─────────────────────────────────────────────
// NEW ACTIONS — Phase 1.2
// ─────────────────────────────────────────────

/**
 * Log a manual sensor reading with expanded fields (pH, DO, pressure).
 */
export async function logManualReading(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireActiveBrewery()
    const { data: { user } } = await supabase.auth.getUser()

    const batchId = formData.get('batchId') as string
    const externalId = (formData.get('external_id') as string | null)?.trim() || null
    if (!batchId) return { success: false, error: 'Batch ID is required' }

    const parseOptional = (key: string) => {
      const val = formData.get(key) as string
      if (!val || val.trim() === '') return null
      const n = parseFloat(val)
      return isNaN(n) ? null : n
    }

    const reqHeaders = await headers()
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || 'unknown'

    const reading: Record<string, unknown> = {
      batch_id: batchId,
      external_id: externalId,
      temperature: parseOptional('temperature'),
      gravity: parseOptional('gravity'),
      ph: parseOptional('ph'),
      dissolved_oxygen: parseOptional('dissolved_oxygen'),
      pressure: parseOptional('pressure'),
      notes: (formData.get('notes') as string) || null,
      logger_id: user?.id ?? null,
      provenance_ip: ip,
      provenance_user_agent: userAgent,
    }

    if (externalId) {
      reading.external_id = externalId
    }

    const { error } = await supabase.from('batch_readings').insert(reading)
    if (error) {
      if (isUniqueViolationFor(error, 'external_id')) {
        return { success: true, data: null }
      }

      console.error('Failed to log reading:', error)
      return { success: false, error: sanitizeDbError(error, 'logManualReading') || 'Failed to save reading' }
    }

    // Run alert check after inserting a new reading
    await runFermentationAlertCheck(batchId)

    revalidatePath(`/batches/${batchId}`)
    revalidatePath('/dashboard')
    return { success: true, data: null }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    return { success: false, error: msg || 'Failed to save reading' }
  }
}

/**
 * Log a yeast viability reading.
 */
export async function logYeastViability(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const { data: { user } } = await supabase.auth.getUser()

    const batchId = formData.get('batchId') as string
    if (!batchId) return { success: false, error: 'Batch ID is required' }

    const parseOptional = (key: string) => {
      const val = formData.get(key) as string
      if (!val || val.trim() === '') return null
      const n = parseFloat(val)
      return isNaN(n) ? null : n
    }

    const yeastLog = {
      batch_id: batchId,
      brewery_id: brewery.id,
      cell_density: parseOptional('cell_density'),
      viability_pct: parseOptional('viability_pct'),
      pitch_rate: parseOptional('pitch_rate'),
      notes: (formData.get('notes') as string) || null,
      logged_by: user?.id ?? null,
    }

    const { error } = await supabase.from('yeast_logs').insert(yeastLog)
    if (error) {
      console.error('Failed to log yeast viability:', error)
      return { success: false, error: 'Failed to log yeast viability' }
    }

    revalidatePath(`/batches/${batchId}`)
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
  }
}

/**
 * Run fermentation alert detection for a batch and persist any new alerts.
 * Deduplicates: skips alert types that already have an 'active' alert.
 */
export async function runFermentationAlertCheck(batchId: string): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()

    // Fetch batch config (for target temp)
    const { data: batch } = await supabase
      .from('batches')
      .select('target_temp')
      .eq('id', batchId)
      .eq('brewery_id', brewery.id)
      .single()

    // Fetch last 50 readings
    const { data: readings } = await supabase
      .from('batch_readings')
      .select('id, gravity, temperature, ph, dissolved_oxygen, pressure, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!readings || readings.length === 0) {
      return { success: true, data: { alerts_created: 0 } }
    }

    // Fetch currently active alert types to avoid duplication
    const { data: activeAlerts } = await supabase
      .from('fermentation_alerts')
      .select('alert_type')
      .eq('batch_id', batchId)
      .eq('status', 'active')

    const activeTypes = new Set((activeAlerts || []).map((a) => a.alert_type))

    // Run detection engine
    const config: BatchConfig = {
      target_temp: (batch as { target_temp?: number | null })?.target_temp ?? null,
    }
    const detected = detectFermentationAlerts(readings as BatchReadingInput[], config)

    // Filter out already-active alert types
    const newAlerts = detected
      .filter((alert) => !activeTypes.has(alert.alert_type))
      .map((alert) => ({
        batch_id: batchId,
        brewery_id: brewery.id,
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        threshold_value: alert.threshold_value,
        actual_value: alert.actual_value,
        status: 'active' as const,
      }))

    if (newAlerts.length > 0) {
      // 1. Insert to DB
      const { data: insertedAlerts, error } = await supabase
        .from('fermentation_alerts')
        .insert(newAlerts)
        .select()
        
      if (error) {
        console.error('Failed to insert fermentation alerts:', error)
      } else if (insertedAlerts) {
        // 2. Dispatch push notifications in the background
        insertedAlerts.forEach((alert) => {
          // Fire and forget
          sendFermentationAlertNotification(brewery.id, alert).catch((e) => 
            console.error('Failed to send fermentation alert notification implicitly', e)
          )
        })
      }
    }

    revalidatePath(`/batches/${batchId}`)
    return { success: true, data: { alerts_created: newAlerts.length } }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
  }
}

/**
 * Acknowledge a fermentation alert.
 */
export async function acknowledgeAlert(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, brewery } = await requireActiveBrewery()
    const { data: { user } } = await supabase.auth.getUser()

    const alertId = formData.get('alertId') as string
    const batchId = formData.get('batchId') as string

    if (!alertId) return { success: false, error: 'Alert ID is required' }

    const { error } = await supabase
      .from('fermentation_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: user?.id ?? null,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('brewery_id', brewery.id)
      .eq('status', 'active')

    if (error) {
      console.error('Failed to acknowledge alert:', error)
      return { success: false, error: 'Failed to acknowledge alert' }
    }

    if (batchId) revalidatePath(`/batches/${batchId}`)
    return { success: true, data: null }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Authentication error' }
  }
}
