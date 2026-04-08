'use server'

import { generateScenario, type ScenarioOptions, type ScenarioTemplateId } from '@/lib/dev-seeder'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Guard ──────────────────────────────────────────────────────────────
function assertDev() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dev-only action called outside development mode')
  }
}

function formatScenarioTemplate(template: ScenarioTemplateId) {
  return template
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
}

async function insertChunked<T>(
  items: T[],
  chunkSize: number,
  insertChunk: (chunk: T[]) => PromiseLike<{ error?: { message: string } | null }>,
) {
  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize)
    const { error } = await insertChunk(chunk)
    if (error) {
      throw new Error(error.message)
    }
  }
}

// ─── Seed: Random Scenario ───────────────────────────────────────────
export async function seedRandomScenario(
  breweryId: string,
  input: {
    seed?: string
    template?: ScenarioTemplateId
    opts?: Omit<ScenarioOptions, 'template'>
  } = {},
) {
  assertDev()

  const { supabase, brewery } = await requireActiveBrewery()
  if (brewery.id !== breweryId) {
    return { success: false, error: 'Active brewery mismatch for dev seed request.' }
  }

  const scenario = generateScenario(input.seed, {
    template: input.template,
    size: input.opts?.size,
    density: input.opts?.density,
  })

  const tankRows = scenario.tanks.map((tank) => ({
    brewery_id: brewery.id,
    ...tank.insert,
  }))

  const batchRows = scenario.batches.map((batch) => ({
    brewery_id: brewery.id,
    ...batch.insert,
  }))

  const inventoryRows = scenario.inventory.map((item) => ({
    brewery_id: brewery.id,
    ...item.insert,
  }))

  const { data: insertedTanks, error: tankError } = tankRows.length > 0
    ? await supabase.from('tanks').insert(tankRows).select('id, name')
    : { data: [], error: null }

  if (tankError) {
    return { success: false, error: `Tank seeding failed: ${tankError.message}` }
  }

  const { data: insertedBatches, error: batchError } = batchRows.length > 0
    ? await supabase.from('batches').insert(batchRows).select('id, recipe_name')
    : { data: [], error: null }

  if (batchError) {
    return { success: false, error: `Batch seeding failed: ${batchError.message}` }
  }

  const tankIdByName = new Map((insertedTanks ?? []).map((tank) => [tank.name, tank.id]))
  const batchIdByName = new Map((insertedBatches ?? []).map((batch) => [batch.recipe_name, batch.id]))
  const batchIdByKey = new Map(
    scenario.batches
      .map((batch) => {
        const batchId = batchIdByName.get(batch.insert.recipe_name)
        return batchId ? [batch.key, batchId] : null
      })
      .filter((entry): entry is [string, string] => entry !== null),
  )

  for (const tank of scenario.tanks) {
    if (!tank.batchKey) {
      continue
    }

    const tankId = tankIdByName.get(tank.insert.name)
    const batchId = batchIdByKey.get(tank.batchKey)
    if (!tankId || !batchId) {
      continue
    }

    await supabase
      .from('tanks')
      .update({ current_batch_id: batchId, status: tank.insert.status })
      .eq('id', tankId)
  }

  const readingRows = scenario.readings
    .map((reading) => {
      const batchId = batchIdByKey.get(reading.batchKey)
      if (!batchId) {
        return null
      }

      return {
        batch_id: batchId,
        ...reading.insert,
      }
    })
    .filter((reading): reading is NonNullable<typeof reading> => reading !== null)

  try {
    await insertChunked(readingRows, 250, (chunk) => supabase.from('batch_readings').insert(chunk))
  } catch (error) {
    return {
      success: false,
      error: `Reading seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  if (inventoryRows.length > 0) {
    const { error: inventoryError } = await supabase.from('inventory').insert(inventoryRows)
    if (inventoryError) {
      return { success: false, error: `Inventory seeding failed: ${inventoryError.message}` }
    }
  }

  const alertRows = scenario.alerts
    .map((alert) => {
      const batchId = batchIdByKey.get(alert.batchKey)
      if (!batchId) {
        return null
      }

      return {
        batch_id: batchId,
        brewery_id: brewery.id,
        ...alert.insert,
      }
    })
    .filter((alert): alert is NonNullable<typeof alert> => alert !== null)

  try {
    await insertChunked(alertRows, 100, (chunk) => supabase.from('fermentation_alerts').insert(chunk))
  } catch (error) {
    return {
      success: false,
      error: `Alert seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  revalidatePath('/inventory')
  revalidatePath('/tanks')

  return {
    success: true,
    seed: scenario.seed,
    summary: scenario.summary,
    message: `Seeded ${formatScenarioTemplate(scenario.template)} with seed ${scenario.seed} (${scenario.summary.batches} batches, ${scenario.summary.tanks} tanks, ${scenario.summary.inventory} inventory, ${scenario.summary.alerts} alerts)`,
  }
}

// ─── IoT Simulation ─────────────────────────────────────────────────────
export async function simulateIotReading(
  breweryId: string,
  payload: {
    tankId?: string
    batchId?: string
    temperature?: number
    gravity?: string
    ph?: number
    dissolved_oxygen?: number
    pressure?: number
    notes?: string
  }
) {
  assertDev()
  const supabase = await createClient()

  let targetBatchId = payload.batchId

  // Resolve batch from tank if needed
  if (!targetBatchId && payload.tankId) {
    const { data: tank } = await supabase
      .from('tanks')
      .select('current_batch_id')
      .eq('id', payload.tankId)
      .eq('brewery_id', breweryId)
      .single()

    if (!tank?.current_batch_id) {
      return { success: false, error: 'No active batch found for this tank' }
    }
    targetBatchId = tank.current_batch_id
  }

  if (!targetBatchId) {
    // If no batch or tank specified, use the most recent fermenting batch
    const { data: batch } = await supabase
      .from('batches')
      .select('id')
      .eq('brewery_id', breweryId)
      .eq('status', 'fermenting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!batch) {
      return { success: false, error: 'No fermenting batch found. Seed a fermentation scenario first.' }
    }
    targetBatchId = batch.id
  }

  const { error } = await supabase.from('batch_readings').insert({
    batch_id: targetBatchId,
    temperature: payload.temperature ?? 20.0,
    gravity: payload.gravity ?? null,
    ph: payload.ph ?? null,
    dissolved_oxygen: payload.dissolved_oxygen ?? null,
    pressure: payload.pressure ?? null,
    notes: payload.notes || 'Dev IoT Simulation',
    provenance_ip: '127.0.0.1',
    provenance_user_agent: 'DevTools/1.0',
  })

  if (error) {
    return { success: false, error: `Failed to insert reading: ${error.message}` }
  }

  // Run alert detection
  try {
    const { detectFermentationAlerts } = await import('@/lib/fermentation-alerts')
    const { data: readings } = await supabase
      .from('batch_readings')
      .select('*')
      .eq('batch_id', targetBatchId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: batchConfig } = await supabase
      .from('batches')
      .select('brewery_id')
      .eq('id', targetBatchId)
      .single()

    if (readings && batchConfig) {
      const { data: activeAlerts } = await supabase
        .from('fermentation_alerts')
        .select('alert_type')
        .eq('batch_id', targetBatchId)
        .eq('status', 'active')

      const activeTypes = new Set((activeAlerts || []).map((a: { alert_type: string }) => a.alert_type))
      const detected = detectFermentationAlerts(readings as Parameters<typeof detectFermentationAlerts>[0], {
        target_temp: null,
      })

      const newAlerts = detected
        .filter((a) => !activeTypes.has(a.alert_type))
        .map((a) => ({
          batch_id: targetBatchId,
          brewery_id: batchConfig.brewery_id,
          alert_type: a.alert_type,
          severity: a.severity,
          message: a.message,
          threshold_value: a.threshold_value,
          actual_value: a.actual_value,
          status: 'active' as const,
        }))

      if (newAlerts.length > 0) {
        await supabase.from('fermentation_alerts').insert(newAlerts)
      }
    }
  } catch {
    // Alert detection is best-effort in dev
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  return { success: true, message: `IoT reading injected for batch ${targetBatchId}` }
}

// ─── IoT Burst (multiple readings) ────────────────────────────────────
export async function simulateIotBurst(
  breweryId: string,
  count: number = 10,
  intervalMinutes: number = 15
) {
  assertDev()
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select('id')
    .eq('brewery_id', breweryId)
    .eq('status', 'fermenting')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!batch) {
    return { success: false, error: 'No fermenting batch found. Seed a fermentation scenario first.' }
  }

  const now = Date.now()
  const readings = Array.from({ length: count }, (_, i) => ({
    batch_id: batch.id,
    temperature: 18 + Math.random() * 4,
    gravity: (1.065 - i * (0.035 / count)).toFixed(3),
    notes: `Dev IoT Burst ${i + 1}/${count}`,
    provenance_ip: '127.0.0.1',
    provenance_user_agent: 'DevTools/1.0',
    created_at: new Date(now - (count - i) * intervalMinutes * 60 * 1000).toISOString(),
  }))

  const { error } = await supabase.from('batch_readings').insert(readings)
  if (error) {
    return { success: false, error: `Burst insert failed: ${error.message}` }
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  return { success: true, message: `${count} readings injected for batch ${batch.id}` }
}

// ─── Cron Trigger (fermentation alerts) ──────────────────────────────
export async function triggerFermentationAlertCron(breweryId: string) {
  assertDev()
  const supabase = await createClient()
  const { detectFermentationAlerts } = await import('@/lib/fermentation-alerts')

  const { data: batches, error } = await supabase
    .from('batches')
    .select('id, recipe_name, status, brewery_id')
    .eq('brewery_id', breweryId)
    .in('status', ['fermenting', 'conditioning'])

  if (error || !batches?.length) {
    return { success: false, error: 'No active batches found for alert check' }
  }

  let totalAlerts = 0
  for (const batch of batches) {
    const { data: readings } = await supabase
      .from('batch_readings')
      .select('*')
      .eq('batch_id', batch.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!readings?.length) continue

    const { data: activeAlerts } = await supabase
      .from('fermentation_alerts')
      .select('alert_type')
      .eq('batch_id', batch.id)
      .eq('status', 'active')

    const activeTypes = new Set((activeAlerts || []).map((a: { alert_type: string }) => a.alert_type))
    const detected = detectFermentationAlerts(readings as Parameters<typeof detectFermentationAlerts>[0], {
      target_temp: null,
    })

    const newAlerts = detected
      .filter((a) => !activeTypes.has(a.alert_type))
      .map((a) => ({
        batch_id: batch.id,
        brewery_id: batch.brewery_id,
        alert_type: a.alert_type,
        severity: a.severity,
        message: a.message,
        threshold_value: a.threshold_value,
        actual_value: a.actual_value,
        status: 'active' as const,
      }))

    if (newAlerts.length > 0) {
      await supabase.from('fermentation_alerts').insert(newAlerts)
      totalAlerts += newAlerts.length
    }
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  return {
    success: true,
    message: `Alert cron complete: ${batches.length} batches scanned, ${totalAlerts} new alerts created`,
  }
}

// ─── Seed: Large Dataset (for performance testing) ───────────────────
export async function seedLargeDataset(
  breweryId: string,
  opts: { batches?: number; readingsPerBatch?: number; tanks?: number; inventory?: number } = {}
) {
  assertDev()
  const supabase = await createClient()

  const batchCount = opts.batches ?? 50
  const readingsPerBatch = opts.readingsPerBatch ?? 20
  const tankCount = opts.tanks ?? 10
  const inventoryCount = opts.inventory ?? 30

  // Seed tanks
  const tanks = Array.from({ length: tankCount }, (_, i) => ({
    brewery_id: breweryId,
    name: `Perf-Tank-${String(i + 1).padStart(3, '0')}`,
    status: ['ready', 'fermenting', 'conditioning', 'cleaning'][i % 4],
    capacity: [5, 10, 15, 20, 30][i % 5],
  }))
  await supabase.from('tanks').insert(tanks)

  // Seed batches + readings
  const RECIPES = ['Hazy IPA', 'Porter', 'Lager', 'Stout', 'Pale Ale', 'Wheat', 'Sour', 'Saison']
  const STATUSES = ['fermenting', 'conditioning', 'complete', 'brewing']
  const batchData = Array.from({ length: batchCount }, (_, i) => ({
    brewery_id: breweryId,
    recipe_name: `${RECIPES[i % RECIPES.length]} #PERF-${String(i + 1).padStart(3, '0')}`,
    status: STATUSES[i % STATUSES.length],
    og: (1.040 + Math.random() * 0.040).toFixed(3),
  }))

  const { data: insertedBatches, error: batchError } = await supabase
    .from('batches')
    .insert(batchData)
    .select('id')

  if (batchError || !insertedBatches) {
    return { success: false, error: `Batch seeding failed: ${batchError?.message}` }
  }

  // Seed readings in chunks
  const allReadings = insertedBatches.flatMap((batch) => {
    const now = Date.now()
    return Array.from({ length: readingsPerBatch }, (_, j) => ({
      batch_id: batch.id,
      temperature: 18 + Math.random() * 6,
      gravity: (1.060 - j * (0.040 / readingsPerBatch)).toFixed(3),
      notes: `Perf reading ${j + 1}`,
      created_at: new Date(now - (readingsPerBatch - j) * 30 * 60 * 1000).toISOString(),
    }))
  })

  // Insert in chunks of 500
  for (let i = 0; i < allReadings.length; i += 500) {
    const chunk = allReadings.slice(i, i + 500)
    await supabase.from('batch_readings').insert(chunk)
  }

  // Seed inventory
  const TYPES = ['Grain', 'Hops', 'Yeast', 'Adjunct', 'Packaging'] as const
  const inventoryData = Array.from({ length: inventoryCount }, (_, i) => ({
    brewery_id: breweryId,
    name: `Perf-Item-${String(i + 1).padStart(3, '0')}`,
    item_type: TYPES[i % TYPES.length],
    current_stock: Math.floor(Math.random() * 1000),
    unit: 'kg',
    reorder_point: Math.floor(Math.random() * 100),
  }))
  await supabase.from('inventory').insert(inventoryData)

  revalidatePath('/', 'layout')
  return {
    success: true,
    message: `Seeded ${batchCount} batches (${allReadings.length} readings), ${tankCount} tanks, ${inventoryCount} inventory items`,
  }
}

// ─── Seed: Degradation Scenario ──────────────────────────────────────
export async function seedDegradationScenario(breweryId: string) {
  assertDev()
  const supabase = await createClient()

  const items = [
    {
      brewery_id: breweryId,
      name: 'Pale Malt (Degraded)',
      item_type: 'Grain' as const,
      current_stock: 500,
      unit: 'kg',
      reorder_point: 100,
      hsi_initial: 12.0,
      hsi_current: 8.5,
      hsi_loss_rate: 0.15,
      grain_moisture_initial: 4.0,
      grain_moisture_current: 6.8,
      degradation_tracked: true,
      storage_condition: 'room_temp' as const,
      received_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_degradation_calc: new Date().toISOString(),
    },
    {
      brewery_id: breweryId,
      name: 'Cascade Hops (Fresh)',
      item_type: 'Hops' as const,
      current_stock: 10,
      unit: 'kg',
      reorder_point: 3,
      hsi_initial: 30.0,
      hsi_current: 28.5,
      hsi_loss_rate: 0.05,
      degradation_tracked: true,
      storage_condition: 'cool_dry' as const,
      received_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      last_degradation_calc: new Date().toISOString(),
    },
    {
      brewery_id: breweryId,
      name: 'Crystal 60L (Aged)',
      item_type: 'Grain' as const,
      current_stock: 200,
      unit: 'kg',
      reorder_point: 50,
      hsi_initial: 15.0,
      hsi_current: 5.0,
      hsi_loss_rate: 0.25,
      grain_moisture_initial: 3.5,
      grain_moisture_current: 9.2,
      ppg_initial: 34,
      ppg_current: 28,
      degradation_tracked: true,
      storage_condition: 'warm' as const,
      received_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      last_degradation_calc: new Date().toISOString(),
    },
  ]

  const { error } = await supabase.from('inventory').insert(items)
  if (error) return { success: false, error: `Degradation seed failed: ${error.message}` }

  revalidatePath('/inventory')
  return { success: true, message: 'Degradation scenario seeded: 3 items with varying degradation states' }
}

// ─── Generate Fermentation Alerts ────────────────────────────────────
export async function seedFermentationAlerts(breweryId: string) {
  assertDev()
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select('id')
    .eq('brewery_id', breweryId)
    .in('status', ['fermenting', 'conditioning'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!batch) {
    return { success: false, error: 'No active batch found. Seed a fermentation scenario first.' }
  }

  const alerts = [
    {
      batch_id: batch.id,
      brewery_id: breweryId,
      alert_type: 'temperature_deviation',
      severity: 'critical',
      message: 'Temperature exceeded safe range: 28°C detected',
      threshold_value: 24,
      actual_value: 28,
      status: 'active',
    },
    {
      batch_id: batch.id,
      brewery_id: breweryId,
      alert_type: 'stuck_fermentation',
      severity: 'warning',
      message: 'Gravity unchanged for 48+ hours',
      threshold_value: 0.002,
      actual_value: 0.0,
      status: 'active',
    },
    {
      batch_id: batch.id,
      brewery_id: breweryId,
      alert_type: 'ph_out_of_range',
      severity: 'warning',
      message: 'pH drifting outside target range',
      threshold_value: 4.2,
      actual_value: 3.8,
      status: 'active',
    },
  ]

  const { error } = await supabase.from('fermentation_alerts').insert(alerts)
  if (error) return { success: false, error: `Alert seed failed: ${error.message}` }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  return { success: true, message: `3 fermentation alerts created for batch ${batch.id}` }
}
