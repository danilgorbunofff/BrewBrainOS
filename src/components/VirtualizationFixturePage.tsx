import { BatchesTable } from '@/components/BatchesTable'
import { InventoryTable } from '@/components/InventoryTable'

const FIXTURE_DATE = new Date('2026-04-07T12:00:00.000Z')
const INVENTORY_TYPES = ['Hops', 'Grain', 'Yeast', 'Adjunct', 'Packaging'] as const
const BATCH_STATUSES = ['brewing', 'fermenting', 'conditioning', 'packaging', 'complete'] as const

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().split('T')[0]
}

function buildInventoryFixture(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const itemType = INVENTORY_TYPES[index % INVENTORY_TYPES.length]
    const currentStock = (index % 14) + 2
    const reorderPoint = (index % 6) + 3

    return {
      id: `fixture-item-${index + 1}`,
      name: `${itemType} Fixture ${String(index + 1).padStart(4, '0')}`,
      item_type: itemType,
      current_stock: currentStock,
      unit: itemType === 'Yeast' ? 'pack' : itemType === 'Packaging' ? 'case' : 'kg',
      reorder_point: reorderPoint,
      lot_number: index % 3 === 0 ? `LOT-${2026 + index}` : null,
      expiration_date: index % 4 === 0 ? addDays(FIXTURE_DATE, (index % 180) - 45) : null,
      manufacturer: index % 2 === 0 ? 'Fixture Malt Co.' : 'Northern Hop Works',
      hsi_current: itemType === 'Hops' ? Math.max(22, 100 - (index % 70)) : null,
      grain_moisture_current: itemType === 'Grain' ? 8 + ((index % 11) * 0.7) : null,
      ppg_initial: itemType === 'Grain' ? 37 : null,
      ppg_current: itemType === 'Grain' ? 37 - ((index % 8) * 0.6) : null,
    }
  })
}

function buildBatchFixture(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const status = BATCH_STATUSES[index % BATCH_STATUSES.length]

    return {
      id: `fixture-batch-${index + 1}`,
      recipe_name: `Fixture Batch ${String(index + 1).padStart(4, '0')}`,
      status,
      og: 1.044 + ((index % 8) * 0.003),
      fg: status === 'complete' ? 1.008 + ((index % 3) * 0.001) : null,
      created_at: addDays(FIXTURE_DATE, -(index % 120)),
    }
  })
}

export function VirtualizationFixturePage({
  mode = 'signed-in',
}: {
  mode?: 'benchmark' | 'signed-in'
}) {
  const inventoryItems = buildInventoryFixture(1200)
  const batches = buildBatchFixture(900)

  return (
    <div data-testid="virtualization-fixture-page" className="min-h-screen bg-background text-foreground p-4 md:p-8 pb-24">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {mode === 'benchmark' ? 'Benchmark Fixture' : 'Development Fixture'}
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Table Virtualization Stress Route</h1>
            <p className="max-w-3xl text-sm md:text-base text-muted-foreground">
              This route renders large deterministic fixtures for the inventory and batch tables so scroll behavior,
              measured row heights, and delete confirmation flow can be exercised without production data.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-surface/60 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Inventory rows: {inventoryItems.length}</span>
            <span>Batches: {batches.length}</span>
            <span>Virtualization threshold: 100 rows</span>
            <span>{mode === 'benchmark' ? 'Public dev-only benchmark surface.' : 'Use a desktop viewport to exercise the virtualized table path.'}</span>
          </div>
        </section>

        <section data-benchmark-table-section="inventory" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">Inventory Fixture</h2>
            <p className="text-sm text-muted-foreground">Mixed lot metadata, expiration states, and degradation badges create variable row heights.</p>
          </div>
          <InventoryTable items={inventoryItems} />
        </section>

        <section data-benchmark-table-section="batches" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">Batch Fixture</h2>
            <p className="text-sm text-muted-foreground">Lifecycle states and dense history entries are intended to keep the batch table in its virtualized branch.</p>
          </div>
          <BatchesTable batches={batches} />
        </section>
      </div>
    </div>
  )
}