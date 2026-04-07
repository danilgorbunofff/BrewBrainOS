import { createClient } from '@supabase/supabase-js'
import { recalculateDegradationMetrics } from '@/lib/degradation'
import { withSentry } from '@/lib/with-sentry'

// Helper to format date as YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Daily Degradation Recalculation Cron Job
 * 
 * Endpoint: POST /api/cron/recalculate-degradation
 * 
 * Configuration (Vercel):
 * - Schedule: 0 2 * * * (2 AM UTC daily)
 * - External URL: https://your-domain.com/api/cron/recalculate-degradation
 * - Add Authorization header with secret token
 * 
 * Or use an external scheduler like:
 * - EasyCron.com
 * - AWS CloudWatch
 * - Google Cloud Scheduler
 * - Render Cron Jobs
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export const runtime = 'nodejs'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
export const maxDuration = 300  // 5 minutes max

export const POST = withSentry(async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON] Starting degradation recalculation...')

  const { data: breweries, error: breweriesError } = await supabase
    .from('breweries')
    .select('id')

  if (breweriesError || !breweries) {
    throw new Error(`Failed to fetch breweries: ${breweriesError?.message}`)
  }

  console.log(`[CRON] Processing ${breweries.length} breweries`)

  let totalItemsUpdated = 0
  let totalLogsCreated = 0
  const errors: string[] = []

  for (const brewery of breweries) {
    try {
      const breweriesProcessed = await processBrewer(brewery.id)
      totalItemsUpdated += breweriesProcessed.itemsUpdated
      totalLogsCreated += breweriesProcessed.logsCreated
    } catch (error: unknown) {
      const errorMsg = `Error processing brewery ${brewery.id}: ${getErrorMessage(error)}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  }

  const result = {
    success: true,
    summary: {
      totalBreweries: breweries.length,
      totalItemsUpdated,
      totalLogsCreated,
      errors: errors.length,
    },
    errors,
  }

  console.log('[CRON] Degradation recalculation complete:', result)
  return Response.json(result)
}, { name: 'api/cron/recalculate-degradation' })

/**
 * Process a single brewery's degradation metrics
 */
async function processBrewer(breweryId: string): Promise<{
  itemsUpdated: number
  logsCreated: number
}> {
  // Fetch all items with degradation tracking enabled
  const { data: items, error: fetchError } = await supabase
    .from('inventory')
    .select('*')
    .eq('brewery_id', breweryId)
    .eq('degradation_tracked', true)

  if (fetchError || !items) {
    throw new Error(`Failed to fetch items: ${fetchError?.message}`)
  }

  if (items.length === 0) {
    return { itemsUpdated: 0, logsCreated: 0 }
  }

  let itemsUpdated = 0
  let logsCreated = 0

  // Process each item
  for (const item of items) {
    try {
      const newMetrics = recalculateDegradationMetrics(item)

      // Calculate changes
      const hsiChange = item.hsi_current && newMetrics.hsi_current
        ? Math.abs(item.hsi_current - newMetrics.hsi_current)
        : 0

      const moistureChange = item.grain_moisture_current && newMetrics.grain_moisture_current
        ? Math.abs(item.grain_moisture_current - newMetrics.grain_moisture_current)
        : 0

      const ppgChange = item.ppg_current && newMetrics.ppg_current
        ? Math.abs(item.ppg_current - newMetrics.ppg_current)
        : 0

      // Create audit log if there are significant changes (>1% loss or >0.5 PPG)
      const hasSignificantChange = hsiChange > 1 || moistureChange > 1 || ppgChange > 0.5

      if (hasSignificantChange) {
        const { error: logError } = await supabase
          .from('degradation_logs')
          .insert({
            inventory_id: item.id,
            brewery_id: breweryId,
            hsi_before: item.hsi_current,
            hsi_after: newMetrics.hsi_current,
            grain_moisture_before: item.grain_moisture_current,
            grain_moisture_after: newMetrics.grain_moisture_current,
            ppg_before: item.ppg_current,
            ppg_after: newMetrics.ppg_current,
            change_reason: 'auto_calc',
            storage_condition_at_time: item.storage_condition,
            days_elapsed: item.received_date
              ? Math.floor(
                  (Date.now() - new Date(item.received_date).getTime()) /
                  (1000 * 60 * 60 * 24)
                )
              : 0,
          })

        if (logError) {
          console.warn(`[CRON] Failed to create log for item ${item.id}: ${logError.message}`)
        } else {
          logsCreated++
        }
      }

      // Update item with new metrics
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          hsi_current: newMetrics.hsi_current,
          grain_moisture_current: newMetrics.grain_moisture_current,
          ppg_current: newMetrics.ppg_current,
          last_degradation_calc: getToday(),
        })
        .eq('id', item.id)

      if (updateError) {
        throw new Error(`Failed to update item ${item.id}: ${updateError.message}`)
      }

      itemsUpdated++
    } catch (error: unknown) {
      console.warn(`[CRON] Error processing item ${item.id}: ${getErrorMessage(error)}`)
      // Continue processing other items even if one fails
    }
  }

  return { itemsUpdated, logsCreated }
}
