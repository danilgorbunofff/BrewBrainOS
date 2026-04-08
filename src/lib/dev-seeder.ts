import type {
  BatchStatus,
  FermentationAlertSeverity,
  FermentationAlertType,
  InventoryType,
  StorageCondition,
  TankStatus,
} from '@/types/database'

export type ScenarioTemplateId =
  | 'activeFermentation'
  | 'stockedVessels'
  | 'inventoryRestock'
  | 'criticalAlerts'

export type ScenarioSize = 'small' | 'medium' | 'large'
export type ScenarioDensity = 'sparse' | 'balanced' | 'dense'

export interface ScenarioOptions {
  template?: ScenarioTemplateId
  size?: ScenarioSize
  density?: ScenarioDensity
}

export interface GeneratedTank {
  key: string
  batchKey?: string
  insert: {
    name: string
    capacity: number
    status: TankStatus
    created_at: string
  }
}

export interface GeneratedBatch {
  key: string
  tankKey?: string
  targetTemp: number
  insert: {
    recipe_name: string
    status: BatchStatus
    og: string
    fg: string | null
    created_at: string
  }
}

export interface GeneratedReading {
  batchKey: string
  insert: {
    temperature: number
    gravity: string | null
    ph: number | null
    dissolved_oxygen: number | null
    pressure: number | null
    notes: string
    provenance_ip: string
    provenance_user_agent: string
    created_at: string
  }
}

export interface GeneratedInventoryItem {
  key: string
  insert: {
    item_type: InventoryType
    name: string
    current_stock: number
    unit: string
    reorder_point: number
    purchase_price: number | null
    lot_number: string
    manufacturer: string
    received_date: string
    last_degradation_calc: string
    degradation_tracked: boolean
    storage_condition: StorageCondition
    hsi_initial: number | null
    hsi_current: number | null
    hsi_loss_rate: number | null
    grain_moisture_initial: number | null
    grain_moisture_current: number | null
    ppg_initial: number | null
    ppg_current: number | null
    expiration_date: string | null
  }
}

export interface GeneratedAlert {
  batchKey: string
  insert: {
    alert_type: FermentationAlertType
    severity: FermentationAlertSeverity
    message: string
    threshold_value: number | null
    actual_value: number | null
    status: 'active'
  }
}

export interface GeneratedScenarioSummary {
  tanks: number
  batches: number
  readings: number
  inventory: number
  alerts: number
}

export interface GeneratedScenario {
  seed: string
  template: ScenarioTemplateId
  options: Required<ScenarioOptions>
  tanks: GeneratedTank[]
  batches: GeneratedBatch[]
  readings: GeneratedReading[]
  inventory: GeneratedInventoryItem[]
  alerts: GeneratedAlert[]
  summary: GeneratedScenarioSummary
}

export const LEGACY_SCENARIO_TEMPLATE_MAP = {
  fermentation: 'activeFermentation',
  vessels: 'stockedVessels',
  inventory_full: 'inventoryRestock',
  alerts: 'criticalAlerts',
} as const

type DensityProfile = {
  tanks: number
  batches: number
  inventory: number
  readingsPerBatch: number
  alerts: number
  activeBatchCount: number
}

const SIZE_PROFILES: Record<ScenarioSize, DensityProfile> = {
  small: { tanks: 4, batches: 2, inventory: 6, readingsPerBatch: 4, alerts: 2, activeBatchCount: 1 },
  medium: { tanks: 6, batches: 3, inventory: 10, readingsPerBatch: 6, alerts: 4, activeBatchCount: 2 },
  large: { tanks: 10, batches: 5, inventory: 16, readingsPerBatch: 9, alerts: 6, activeBatchCount: 3 },
}

const STORAGE_CONDITIONS = ['cool_dry', 'cool_humid', 'room_temp', 'warm'] as const satisfies readonly StorageCondition[]

const DENSITY_MULTIPLIER: Record<ScenarioDensity, number> = {
  sparse: 0.75,
  balanced: 1,
  dense: 1.5,
}

const RECIPE_STYLES = [
  { name: 'Hazy IPA', og: [1.058, 1.072], targetTemp: [18.4, 20.5] },
  { name: 'Czech Pilsner', og: [1.045, 1.056], targetTemp: [10.5, 12.5] },
  { name: 'West Coast IPA', og: [1.056, 1.068], targetTemp: [18.0, 19.6] },
  { name: 'Dry Stout', og: [1.044, 1.056], targetTemp: [18.5, 20.0] },
  { name: 'Saison', og: [1.050, 1.066], targetTemp: [21.0, 24.0] },
  { name: 'Amber Lager', og: [1.048, 1.058], targetTemp: [11.0, 13.5] },
] as const

const TANK_PREFIXES = ['FV', 'BBT', 'UNI', 'SERV'] as const

const INVENTORY_CATALOG: Record<InventoryType, Array<{ name: string; unit: string; manufacturer: string }>> = {
  Grain: [
    { name: 'Pilsner Malt', unit: 'kg', manufacturer: 'Briess' },
    { name: 'Pale Ale Malt', unit: 'kg', manufacturer: 'Rahr' },
    { name: 'Munich Malt', unit: 'kg', manufacturer: 'Weyermann' },
    { name: 'Oats', unit: 'kg', manufacturer: 'Simpson' },
  ],
  Hops: [
    { name: 'Citra Hops', unit: 'kg', manufacturer: 'Yakima Chief' },
    { name: 'Mosaic Hops', unit: 'kg', manufacturer: 'Yakima Chief' },
    { name: 'Saaz Hops', unit: 'kg', manufacturer: 'Hopsteiner' },
    { name: 'Hallertau Blanc', unit: 'kg', manufacturer: 'BarthHaas' },
  ],
  Yeast: [
    { name: 'Ale Yeast', unit: 'pck', manufacturer: 'Fermentis' },
    { name: 'Lager Yeast', unit: 'pck', manufacturer: 'Lallemand' },
    { name: 'House Blend', unit: 'pck', manufacturer: 'Omega' },
  ],
  Adjunct: [
    { name: 'Orange Peel', unit: 'kg', manufacturer: 'BSG' },
    { name: 'Cacao Nibs', unit: 'kg', manufacturer: 'BSG' },
    { name: 'Coriander', unit: 'kg', manufacturer: 'LD Carlson' },
  ],
  Packaging: [
    { name: '12oz Cans', unit: 'pcs', manufacturer: 'Crown' },
    { name: 'Can Lids', unit: 'pcs', manufacturer: 'Crown' },
    { name: 'Keg Spear Kits', unit: 'pcs', manufacturer: 'Micromatic' },
  ],
}

const ALERT_BLUEPRINTS: Array<{
  alert_type: FermentationAlertType
  severity: FermentationAlertSeverity
  threshold_value: number
  actual_value: number
  message: string
}> = [
  {
    alert_type: 'temperature_deviation',
    severity: 'critical',
    threshold_value: 22,
    actual_value: 27.4,
    message: 'Fermenter temperature drifted beyond the configured threshold.',
  },
  {
    alert_type: 'stuck_fermentation',
    severity: 'warning',
    threshold_value: 0.002,
    actual_value: 0,
    message: 'Gravity has stalled for the last two reading intervals.',
  },
  {
    alert_type: 'ph_out_of_range',
    severity: 'warning',
    threshold_value: 4.4,
    actual_value: 3.8,
    message: 'pH drifted outside the acceptable fermentation range.',
  },
  {
    alert_type: 'do_spike',
    severity: 'warning',
    threshold_value: 0.08,
    actual_value: 0.24,
    message: 'Dissolved oxygen spiked after transfer or agitation.',
  },
  {
    alert_type: 'over_pressure',
    severity: 'critical',
    threshold_value: 12,
    actual_value: 16.5,
    message: 'Tank head pressure exceeded the configured safety threshold.',
  },
  {
    alert_type: 'glycol_failure',
    severity: 'critical',
    threshold_value: 21,
    actual_value: 28.2,
    message: 'Cooling performance dropped below the expected glycol response.',
  },
] as const

export function generateScenario(seed?: string, options?: ScenarioOptions): GeneratedScenario {
  const normalizedSeed = normalizeSeed(seed)
  const resolvedOptions: Required<ScenarioOptions> = {
    template: options?.template ?? 'activeFermentation',
    size: options?.size ?? 'medium',
    density: options?.density ?? 'balanced',
  }

  const createSeed = xmur3(normalizedSeed)
  const random = mulberry32(createSeed())
  const profile = buildProfile(resolvedOptions.template, resolvedOptions.size, resolvedOptions.density)
  const seedSuffix = createSeed().toString(36).toUpperCase().slice(0, 4)
  const baseTime = deriveBaseTime(normalizedSeed)

  const batches = buildBatches(profile, resolvedOptions.template, random, seedSuffix, baseTime)
  const tanks = buildTanks(profile, batches, resolvedOptions.template, random, seedSuffix, baseTime)
  const readings = buildReadings(profile, batches, resolvedOptions.template, random, baseTime)
  const inventory = buildInventory(profile, resolvedOptions.template, random, seedSuffix, baseTime)
  const alerts = buildAlerts(profile, batches, resolvedOptions.template, random)

  return {
    seed: normalizedSeed,
    template: resolvedOptions.template,
    options: resolvedOptions,
    tanks,
    batches,
    readings,
    inventory,
    alerts,
    summary: {
      tanks: tanks.length,
      batches: batches.length,
      readings: readings.length,
      inventory: inventory.length,
      alerts: alerts.length,
    },
  }
}

function buildProfile(template: ScenarioTemplateId, size: ScenarioSize, density: ScenarioDensity): DensityProfile {
  const base = SIZE_PROFILES[size]
  const multiplier = DENSITY_MULTIPLIER[density]
  const scaled = {
    tanks: Math.max(2, Math.round(base.tanks * multiplier)),
    batches: Math.max(1, Math.round(base.batches * multiplier)),
    inventory: Math.max(4, Math.round(base.inventory * multiplier)),
    readingsPerBatch: Math.max(3, Math.round(base.readingsPerBatch * multiplier)),
    alerts: Math.max(1, Math.round(base.alerts * multiplier)),
    activeBatchCount: Math.max(1, Math.round(base.activeBatchCount * multiplier)),
  }

  if (template === 'inventoryRestock') {
    scaled.inventory = Math.max(scaled.inventory, size === 'large' ? 24 : size === 'medium' ? 14 : 8)
    scaled.batches = Math.max(1, Math.min(scaled.batches, 2))
    scaled.alerts = 0
  }

  if (template === 'stockedVessels') {
    scaled.tanks = Math.max(scaled.tanks, scaled.batches + 2)
    scaled.alerts = 0
  }

  if (template === 'criticalAlerts') {
    scaled.alerts = Math.max(3, scaled.alerts)
    scaled.activeBatchCount = Math.max(2, scaled.activeBatchCount)
    scaled.batches = Math.max(scaled.activeBatchCount, scaled.batches)
  }

  if (template === 'activeFermentation') {
    scaled.activeBatchCount = Math.max(1, scaled.activeBatchCount)
  }

  return scaled
}

function buildBatches(
  profile: DensityProfile,
  template: ScenarioTemplateId,
  random: () => number,
  seedSuffix: string,
  baseTime: number,
): GeneratedBatch[] {
  return Array.from({ length: profile.batches }, (_, index) => {
    const style = RECIPE_STYLES[index % RECIPE_STYLES.length]
    const isActive = index < profile.activeBatchCount
    const status = resolveBatchStatus(template, index, isActive)
    const og = roundDecimal(randomBetween(random, style.og[0], style.og[1]), 3)
    const fg = status === 'complete' ? roundDecimal(og - randomBetween(random, 0.038, 0.048), 3) : null
    const recipeSerial = String(index + 1).padStart(2, '0')
    const recipeName = `${style.name} #OD-${seedSuffix}-${recipeSerial}`

    return {
      key: `batch-${recipeSerial}`,
      tankKey: `tank-${recipeSerial}`,
      targetTemp: roundDecimal(randomBetween(random, style.targetTemp[0], style.targetTemp[1]), 1),
      insert: {
        recipe_name: recipeName,
        status,
        og: og.toFixed(3),
        fg: fg === null ? null : fg.toFixed(3),
        created_at: timestampFromOffset(baseTime, -((index + 1) * 9 + Math.floor(randomBetween(random, 1, 6))) * 60),
      },
    }
  })
}

function buildTanks(
  profile: DensityProfile,
  batches: GeneratedBatch[],
  template: ScenarioTemplateId,
  random: () => number,
  seedSuffix: string,
  baseTime: number,
): GeneratedTank[] {
  return Array.from({ length: profile.tanks }, (_, index) => {
    const tankSerial = String(index + 1).padStart(2, '0')
    const assignedBatch = batches[index] ?? null
    const status = assignedBatch
      ? resolveTankStatus(assignedBatch.insert.status)
      : resolveIdleTankStatus(template, index)

    return {
      key: `tank-${tankSerial}`,
      batchKey: assignedBatch?.key,
      insert: {
        name: `${TANK_PREFIXES[index % TANK_PREFIXES.length]}-${seedSuffix}-${tankSerial}`,
        capacity: roundDecimal([5, 7, 10, 15, 20, 30][index % 6] + randomBetween(random, 0, 1.5), 1),
        status,
        created_at: timestampFromOffset(baseTime, -((index + 1) * 7 + 4) * 60),
      },
    }
  })
}

function buildReadings(
  profile: DensityProfile,
  batches: GeneratedBatch[],
  template: ScenarioTemplateId,
  random: () => number,
  baseTime: number,
): GeneratedReading[] {
  const readings: GeneratedReading[] = []

  for (const [index, batch] of batches.entries()) {
    const shouldGenerate = batch.insert.status === 'fermenting' || batch.insert.status === 'conditioning' || template === 'criticalAlerts'
    if (!shouldGenerate) {
      continue
    }

    const og = Number(batch.insert.og)
    const isAlertBatch = template === 'criticalAlerts' && index < Math.max(2, Math.min(profile.alerts, batches.length))
    const readingCount = Math.max(3, profile.readingsPerBatch - (batch.insert.status === 'conditioning' ? 1 : 0))

    for (let readingIndex = 0; readingIndex < readingCount; readingIndex += 1) {
      const progress = readingCount === 1 ? 1 : readingIndex / (readingCount - 1)
      const gravityDrop = isAlertBatch
        ? randomBetween(random, 0.004, 0.012)
        : randomBetween(random, 0.018, 0.042)
      const gravity = Math.max(1.008, og - gravityDrop * progress)
      const targetTemp = batch.targetTemp
      const temperature = isAlertBatch
        ? targetTemp + randomBetween(random, 3.2, 6.4)
        : targetTemp + randomBetween(random, -0.7, 0.9)

      readings.push({
        batchKey: batch.key,
        insert: {
          temperature: roundDecimal(temperature, 1),
          gravity: gravity.toFixed(3),
          ph: roundDecimal(isAlertBatch ? randomBetween(random, 3.6, 3.9) : randomBetween(random, 4.1, 4.4), 2),
          dissolved_oxygen: roundDecimal(isAlertBatch ? randomBetween(random, 0.12, 0.28) : randomBetween(random, 0.02, 0.08), 2),
          pressure: roundDecimal(isAlertBatch ? randomBetween(random, 11.8, 16.5) : randomBetween(random, 6.5, 10.2), 1),
          notes: isAlertBatch ? 'Overdrive alert rehearsal' : 'Overdrive fermentation trend',
          provenance_ip: '127.0.0.1',
          provenance_user_agent: 'OverdriveSeeder/1.0',
          created_at: timestampFromOffset(baseTime, -((readingCount - readingIndex) * 4 + index * 2) * 60),
        },
      })
    }
  }

  return readings
}

function buildInventory(
  profile: DensityProfile,
  template: ScenarioTemplateId,
  random: () => number,
  seedSuffix: string,
  baseTime: number,
): GeneratedInventoryItem[] {
  const types = Object.keys(INVENTORY_CATALOG) as InventoryType[]

  return Array.from({ length: profile.inventory }, (_, index) => {
    const itemType = types[index % types.length]
    const catalog = INVENTORY_CATALOG[itemType]
    const templateItem = catalog[index % catalog.length]
    const stockScale = template === 'inventoryRestock' ? randomBetween(random, 1.2, 1.8) : randomBetween(random, 0.7, 1.3)
    const currentStock = roundDecimal(resolveInventoryBaseStock(itemType) * stockScale, itemType === 'Packaging' ? 0 : 1)
    const reorderPoint = roundDecimal(currentStock * randomBetween(random, 0.18, 0.3), itemType === 'Packaging' ? 0 : 1)
    const degradationTracked = itemType === 'Hops' || itemType === 'Grain'
    const storage: StorageCondition = itemType === 'Packaging' ? 'room_temp' : pick(random, STORAGE_CONDITIONS)
    const receivedDaysAgo = Math.floor(randomBetween(random, 5, template === 'criticalAlerts' ? 180 : 75))
    const receivedDate = dateFromOffset(baseTime, -(receivedDaysAgo * 24 * 60))

    return {
      key: `inventory-${String(index + 1).padStart(2, '0')}`,
      insert: {
        item_type: itemType,
        name: `${templateItem.name} #OD-${seedSuffix}-${String(index + 1).padStart(2, '0')}`,
        current_stock: currentStock,
        unit: templateItem.unit,
        reorder_point: reorderPoint,
        purchase_price: roundDecimal(resolveInventoryPrice(itemType) * randomBetween(random, 0.85, 1.2), 2),
        lot_number: `LOT-${seedSuffix}-${String(index + 1).padStart(3, '0')}`,
        manufacturer: templateItem.manufacturer,
        received_date: receivedDate,
        last_degradation_calc: dateFromOffset(baseTime, -60),
        degradation_tracked: degradationTracked,
        storage_condition: storage,
        hsi_initial: itemType === 'Hops' ? roundDecimal(randomBetween(random, 18, 32), 1) : null,
        hsi_current: itemType === 'Hops'
          ? roundDecimal(randomBetween(random, template === 'criticalAlerts' ? 8 : 14, template === 'criticalAlerts' ? 18 : 28), 1)
          : null,
        hsi_loss_rate: itemType === 'Hops' ? roundDecimal(randomBetween(random, 0.08, 0.24), 2) : null,
        grain_moisture_initial: itemType === 'Grain' ? roundDecimal(randomBetween(random, 3.4, 4.5), 1) : null,
        grain_moisture_current: itemType === 'Grain'
          ? roundDecimal(randomBetween(random, template === 'criticalAlerts' ? 6.8 : 4.1, template === 'criticalAlerts' ? 9.2 : 6.4), 1)
          : null,
        ppg_initial: itemType === 'Grain' ? roundDecimal(randomBetween(random, 33, 38), 0) : null,
        ppg_current: itemType === 'Grain' ? roundDecimal(randomBetween(random, 29, 36), 0) : null,
        expiration_date: itemType === 'Yeast' ? dateFromOffset(baseTime, Math.floor(randomBetween(random, 18, 120)) * 24 * 60) : null,
      },
    }
  })
}

function buildAlerts(
  profile: DensityProfile,
  batches: GeneratedBatch[],
  template: ScenarioTemplateId,
  random: () => number,
): GeneratedAlert[] {
  if (template !== 'criticalAlerts') {
    return []
  }

  const activeBatches = batches.filter((batch) => batch.insert.status === 'fermenting' || batch.insert.status === 'conditioning')
  const alerts: GeneratedAlert[] = []

  for (let index = 0; index < profile.alerts; index += 1) {
    const batch = activeBatches[index % activeBatches.length]
    const blueprint = ALERT_BLUEPRINTS[index % ALERT_BLUEPRINTS.length]
    const actualValue = blueprint.actual_value + randomBetween(random, -0.3, 0.5)

    alerts.push({
      batchKey: batch.key,
      insert: {
        alert_type: blueprint.alert_type,
        severity: blueprint.severity,
        message: blueprint.message,
        threshold_value: blueprint.threshold_value,
        actual_value: roundDecimal(actualValue, blueprint.actual_value >= 1 ? 1 : 2),
        status: 'active',
      },
    })
  }

  return alerts
}

function resolveBatchStatus(template: ScenarioTemplateId, index: number, isActive: boolean): BatchStatus {
  if (template === 'inventoryRestock') {
    return index === 0 ? 'conditioning' : 'brewing'
  }

  if (template === 'stockedVessels') {
    return (['fermenting', 'conditioning', 'complete'] as BatchStatus[])[index % 3]
  }

  if (template === 'criticalAlerts') {
    return isActive ? (index % 3 === 0 ? 'conditioning' : 'fermenting') : 'packaging'
  }

  return isActive ? 'fermenting' : 'conditioning'
}

function resolveTankStatus(batchStatus: BatchStatus): TankStatus {
  if (batchStatus === 'fermenting') return 'fermenting'
  if (batchStatus === 'conditioning') return 'conditioning'
  return 'ready'
}

function resolveIdleTankStatus(template: ScenarioTemplateId, index: number): TankStatus {
  if (template === 'stockedVessels') {
    return (['ready', 'cleaning', 'maintenance'] as TankStatus[])[index % 3]
  }

  return (['ready', 'cleaning'] as TankStatus[])[index % 2]
}

function resolveInventoryBaseStock(itemType: InventoryType): number {
  if (itemType === 'Packaging') return 8000
  if (itemType === 'Yeast') return 18
  if (itemType === 'Hops') return 18
  if (itemType === 'Adjunct') return 35
  return 850
}

function resolveInventoryPrice(itemType: InventoryType): number {
  if (itemType === 'Packaging') return 0.08
  if (itemType === 'Yeast') return 7.5
  if (itemType === 'Hops') return 24
  if (itemType === 'Adjunct') return 9
  return 1.6
}

function normalizeSeed(seed?: string): string {
  const value = seed?.trim()
  if (value) {
    return value
  }

  return `${Date.now().toString(36)}-${crypto.randomUUID().split('-')[0]}`
}

function deriveBaseTime(seed: string): number {
  const seedHash = xmur3(seed)()
  const start = Date.UTC(2026, 0, 1, 12, 0, 0, 0)
  const minutesInYear = 365 * 24 * 60
  const minuteOffset = seedHash % minutesInYear
  return start + minuteOffset * 60 * 1000
}

function randomBetween(random: () => number, min: number, max: number): number {
  return min + (max - min) * random()
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

function timestampFromOffset(baseTime: number, offsetMinutes: number): string {
  return new Date(baseTime + offsetMinutes * 60 * 1000).toISOString()
}

function dateFromOffset(baseTime: number, offsetMinutes: number): string {
  return timestampFromOffset(baseTime, offsetMinutes).slice(0, 10)
}

function roundDecimal(value: number, precision: number): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function xmur3(value: string) {
  let hash = 1779033703 ^ value.length
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return function next() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    return (hash ^= hash >>> 16) >>> 0
  }
}

function mulberry32(seed: number) {
  return function next() {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}