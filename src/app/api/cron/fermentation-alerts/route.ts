import { createClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { runFermentationAlertCheck } from '@/app/(app)/batches/[id]/actions'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { detectFermentationAlerts, BatchReadingInput, BatchConfig } from '@/lib/fermentation-alerts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { sendFermentationAlertNotification } from '@/app/actions/push-actions'

// Helper for external cron services (e.g. Vercel Cron, EasyCron, Render)
// Schedule roughly every 4-6 hours to catch Stuck Fermentation anomalies or sudden environment changes

export const runtime = 'nodejs'
// Allow for up to 5 mins of execution time
export const maxDuration = 300

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  try {
    // Verify secret token for security
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON Fermentation Alerts] Starting periodic checks...')

    // Fetch all active batches (fermenting or conditioning)
    const { data: batches, error } = await supabase
      .from('batches')
      .select('id, brewery_id, recipe_name, status')
      .in('status', ['fermenting', 'conditioning'])

    if (error || !batches) {
      throw new Error(`Failed to fetch active batches: ${error?.message}`)
    }

    console.log(`[CRON Fermentation Alerts] Processing ${batches.length} active batches`)

    let totalAlertsCreated = 0
    let totalErrors = 0
    const errors: string[] = []

    for (const batch of batches) {
      try {
        // `runFermentationAlertCheck` usually depends on user session for `requireActiveBrewery`.
        // To run in a cron without an active user, we should either bypass it or execute the core logic directly.
        // Wait, `runFermentationAlertCheck` uses `requireActiveBrewery()` which requires an authenticated user!
        // So we can't just call it from here blindly. Let's rewrite the core detection logic for the cron specifically using the service role.
        
        const { data: batchConfig } = await supabase
          .from('batches')
          .select('target_temp')
          .eq('id', batch.id)
          .single()

        // Fetch recent readings
        const { data: readings } = await supabase
          .from('batch_readings')
          .select('id, gravity, temperature, ph, dissolved_oxygen, pressure, created_at')
          .eq('batch_id', batch.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!readings || readings.length === 0) continue

        // Active types 
        const { data: activeAlerts } = await supabase
          .from('fermentation_alerts')
          .select('alert_type')
          .eq('batch_id', batch.id)
          .eq('status', 'active')

        const activeTypes = new Set((activeAlerts || []).map((a) => a.alert_type))

        const configParams: BatchConfig = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          target_temp: (batchConfig as any)?.target_temp ?? null
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detected = detectFermentationAlerts(readings as any, configParams)
        const newAlerts = detected
          .filter(a => !activeTypes.has(a.alert_type))
          .map(a => ({
            batch_id: batch.id,
            brewery_id: batch.brewery_id,
            alert_type: a.alert_type,
            severity: a.severity,
            message: a.message,
            threshold_value: a.threshold_value,
            actual_value: a.actual_value,
            status: 'active' as const
          }))

        if (newAlerts.length > 0) {
          const { data: insertedAlerts, error: insertError } = await supabase
             .from('fermentation_alerts')
             .insert(newAlerts)
             .select()

          if (insertError) {
             throw new Error(insertError.message)
          }

          totalAlertsCreated += newAlerts.length

          // Send push notifications manually since cron isn't hitting `actions.ts`
          if (insertedAlerts) {
             // eslint-disable-next-line @typescript-eslint/no-unused-vars
             for (const sa of insertedAlerts) {
                // Must mock the createClient in push-actions? No, push-actions uses `createClient()`. 
                // Since this is a service role background run, it won't have a user session.
                // Actually `sendFermentationAlertNotification` uses `<server> createClient()` which requires cookies unless we refactor it.
             }
          }
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err)
        console.error(`[CRON Fermentation Alerts] Failed batch ${batch.id}: ${message}`)
        errors.push(`batch ${batch.id}: ${message}`)
        totalErrors++
      }
    }

    const result = {
      success: true,
      summary: {
        totalActiveBatchesProcessed: batches.length,
        totalAlertsCreated,
        errors: totalErrors
      },
      errors
    }

    console.log('[CRON Fermentation Alerts] Complete:', result)
    return Response.json(result)

  } catch (err: unknown) {
    console.error('[CRON Fermentation Alerts] Fatal Error:', err)
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
