import { createClient } from '@supabase/supabase-js'
import type { BatchReadingInput } from '@/lib/fermentation-alerts'
import { withSentry } from '@/lib/with-sentry'

export const runtime = 'nodejs'

export const POST = withSentry(async (req: Request) => {
  // Use service role so we can bypass RLS since IoT sensors don't have authenticated user sessions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '').trim()

  // Find matching brewery with this token
  const { data: brewery, error: breweryError } = await supabase
    .from('breweries')
    .select('id, owner_id')
    .eq('iot_webhook_token', token)
    .single()

  if (breweryError || !brewery) {
    return Response.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
  }

  const payload = await req.json()
  const { tank_id, batch_id, temperature, gravity, ph, dissolved_oxygen, pressure, notes } = payload

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'iot-device'

  if (!tank_id && !batch_id) {
    return Response.json({ error: 'Bad Request: Must provide either tank_id or batch_id' }, { status: 400 })
  }

  let targetBatchId = batch_id

  // If only tank_id is provided, resolve the active batch
  if (!targetBatchId) {
    const { data: tankRecord, error: tankError } = await supabase
      .from('tanks')
      .select('current_batch_id')
      .eq('id', tank_id)
      .eq('brewery_id', brewery.id)
      .single()

    if (tankError || !tankRecord?.current_batch_id) {
      return Response.json({ error: 'No active fetching/conditioning batch found for this tank' }, { status: 404 })
    }

    targetBatchId = tankRecord.current_batch_id
  }

  // Insert the new batch reading
  const { error: insertError } = await supabase
    .from('batch_readings')
    .insert({
      batch_id: targetBatchId,
      temperature: temperature ?? null,
      gravity: gravity ?? null,
      ph: ph ?? null,
      dissolved_oxygen: dissolved_oxygen ?? null,
      pressure: pressure ?? null,
      notes: notes || 'Automated IoT Sensor Reading',
      logger_id: null,
      provenance_ip: ip,
      provenance_user_agent: userAgent
    })

  if (insertError) {
    throw new Error(`Failed to log reading: ${insertError.message}`)
  }

  try {
    const { data: readings } = await supabase
      .from('batch_readings')
      .select('*')
      .eq('batch_id', targetBatchId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: batchConfig } = await supabase
      .from('batches')
      .select('target_temp, brewery_id')
      .eq('id', targetBatchId)
      .single()

    if (readings && batchConfig) {
      const { data: activeAlerts } = await supabase
        .from('fermentation_alerts')
        .select('alert_type')
        .eq('batch_id', targetBatchId)
        .eq('status', 'active')

      const activeTypes = new Set((activeAlerts || []).map((alert) => alert.alert_type))

      const { detectFermentationAlerts } = await import('@/lib/fermentation-alerts')
      const detected = detectFermentationAlerts(readings as BatchReadingInput[], { target_temp: batchConfig.target_temp })

      const newAlerts = detected
        .filter((alert) => !activeTypes.has(alert.alert_type))
        .map((alert) => ({
          batch_id: targetBatchId,
          brewery_id: batchConfig.brewery_id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          threshold_value: alert.threshold_value,
          actual_value: alert.actual_value,
          status: 'active' as const
        }))

      if (newAlerts.length > 0) {
        const { data: insertedAlerts } = await supabase
          .from('fermentation_alerts')
          .insert(newAlerts)
          .select()

        if (insertedAlerts) {
          const { sendFermentationAlertNotification } = await import('@/app/actions/push-actions')
          for (const alert of insertedAlerts) {
            void sendFermentationAlertNotification
            void alert
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to run backend anomaly detection for IoT:', error)
  }

  return Response.json({ success: true, message: 'Reading logged successfully', batch_id: targetBatchId })
}, { name: 'api/iot/log' })
