'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SearchFilter } from '@/components/SearchFilter'
import { ExportCSVButton } from '@/components/ExportCSVButton'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { LucideMinus, LucidePlus, LucideAlertCircle, LucideBoxes, LucideChevronDown } from 'lucide-react'
import { updateStock, deleteInventoryItem } from '@/app/(app)/inventory/actions'
import { getDegradationHealthStatus } from '@/lib/degradation'

interface InventoryItem {
  id: string
  name: string
  item_type: string
  current_stock: number
  unit: string
  reorder_point: number | null
  lot_number?: string | null
  expiration_date?: string | null
  manufacturer?: string | null
  hsi_current?: number | null
  grain_moisture_current?: number | null
  ppg_initial?: number | null
  ppg_current?: number | null
}

const categories = ['All', 'Hops', 'Grain', 'Yeast', 'Adjunct', 'Packaging']
const VIRTUAL_THRESHOLD = 100

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getExpirationStatus(expirationDate: string | null | undefined) {
  if (!expirationDate) return null
  
  const today = new Date()
  const expDate = new Date(expirationDate)
  const daysUntilExpiry = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilExpiry < 0) return { type: 'expired', daysUntilExpiry }
  if (daysUntilExpiry <= 30) return { type: 'expiring', daysUntilExpiry }
  return null
}

function getDegradationBadge(item: InventoryItem) {
  const ppgLoss = item.ppg_initial && item.ppg_current
    ? ((item.ppg_initial - item.ppg_current) / item.ppg_initial) * 100
    : 0

  const healthStatus = getDegradationHealthStatus(
    item.hsi_current,
    item.grain_moisture_current,
    ppgLoss
  )

  const badges = []

  if (item.hsi_current !== null && item.hsi_current !== undefined) {
    const hsiColor = item.hsi_current < 50 
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
      : item.hsi_current < 75 
        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' 
        : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    badges.push(
      <span key="hsi" className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', hsiColor)}>
        HSI {item.hsi_current.toFixed(0)}%
      </span>
    )
  }

  if (item.grain_moisture_current !== null && item.grain_moisture_current !== undefined) {
    const moistureColor = item.grain_moisture_current > 13 
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
      : item.grain_moisture_current < 7 
        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
        : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    badges.push(
      <span key="moisture" className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', moistureColor)}>
        💧 {item.grain_moisture_current.toFixed(1)}%
      </span>
    )
  }

  if (item.ppg_initial && item.ppg_current && ppgLoss > 5) {
    const ppgColor = ppgLoss > 20 
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
      : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
    badges.push(
      <span key="ppg" className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', ppgColor)}>
        PPG -{ppgLoss.toFixed(1)}%
      </span>
    )
  }

  return badges
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ query, showAddCta }: { query: string; showAddCta?: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="max-w-xs mx-auto space-y-2">
        <div className="relative mx-auto mb-6 h-16 w-16">
          <div className="absolute inset-0 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="relative h-16 w-16 rounded-2xl bg-card/80 border border-border flex items-center justify-center shadow-xl">
            <LucideBoxes className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-muted-foreground">{query ? 'No matches' : 'Empty Silos'}</h3>
        <p className="text-sm text-muted-foreground font-medium italic">
          {query
            ? 'Try a different search term.'
            : 'Define your raw material footprint using the form above.'}
        </p>
        {!query && showAddCta && (
          <div className="pt-4">
            <AddInventoryItemDialog />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileInventoryCard({ item }: { item: InventoryItem }) {
  const [expanded, setExpanded] = useState(false)
  const isLowStock = item.current_stock <= (item.reorder_point || 0)
  const hasLotInfo = item.lot_number || item.expiration_date || item.manufacturer
  const expirationStatus = getExpirationStatus(item.expiration_date)
  
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/inventory/${item.id}`} className="flex items-center gap-2 min-w-0 flex-1 group hover:opacity-75 transition-opacity">
            {isLowStock && <LucideAlertCircle className="h-4 w-4 text-primary animate-pulse shrink-0" />}
            {expirationStatus?.type === 'expired' && <LucideAlertCircle className="h-4 w-4 text-red-500 animate-pulse shrink-0" />}
            {expirationStatus?.type === 'expiring' && <LucideAlertCircle className="h-4 w-4 text-yellow-500 animate-pulse shrink-0" />}
            <h3 className="font-black text-base tracking-tight text-foreground truncate group-hover:text-primary group-hover:underline transition-colors">{item.name}</h3>
          </Link>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border shrink-0">
            {item.item_type}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Stock Level</p>
            <span className={cn('font-mono font-black text-2xl tracking-tighter', isLowStock ? 'text-primary' : 'text-muted-foreground')}>
              {item.current_stock}
              <span className="text-xs font-medium text-muted-foreground ml-1.5 uppercase font-sans tracking-normal">{item.unit}</span>
            </span>
            {isLowStock && <p className="text-[9px] font-black uppercase text-primary/50 tracking-widest mt-0.5">Reorder Required</p>}
            {expirationStatus?.type === 'expired' && (
              <p className="text-[9px] font-black uppercase text-red-500/70 tracking-widest mt-0.5">Expired</p>
            )}
            {expirationStatus?.type === 'expiring' && (
              <p className="text-[9px] font-black uppercase text-yellow-500/70 tracking-widest mt-0.5">Expires in {expirationStatus.daysUntilExpiry} days</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <form action={updateStock as any}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="stock" value={Math.max(0, item.current_stock - 1)} />
              <Button type="submit" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-border rounded-xl">
                <LucideMinus className="h-4 w-4" />
              </Button>
            </form>
            <form action={updateStock as any}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="stock" value={item.current_stock + 1} />
              <Button type="submit" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 border border-border rounded-xl">
                <LucidePlus className="h-4 w-4" />
              </Button>
            </form>
            <DeleteConfirmButton action={deleteInventoryItem} hiddenInputs={{ itemId: item.id }} itemName={item.name} />
          </div>
        </div>

        {/* Lot Tracking Details - Expandable */}
        {hasLotInfo && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between pt-2 border-t border-border mt-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Lot Information</span>
              <LucideChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
            </button>
            {expanded && (
              <div className="space-y-2 pt-2 text-sm">
                {item.lot_number && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Lot Number</p>
                    <p className="text-foreground font-mono">{item.lot_number}</p>
                  </div>
                )}
                {item.expiration_date && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Expires</p>
                    <p className="text-foreground font-mono">{new Date(item.expiration_date).toLocaleDateString()}</p>
                  </div>
                )}
                {item.manufacturer && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Manufacturer</p>
                    <p className="text-foreground">{item.manufacturer}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Degradation Metrics */}
        {getDegradationBadge(item).length > 0 && (
          <>
            <div className="pt-2 border-t border-border mt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Quality Metrics</span>
              <div className="flex flex-wrap gap-1">{getDegradationBadge(item)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────

function InventoryRow({ item }: { item: InventoryItem }) {
  const isLowStock = item.current_stock <= (item.reorder_point || 0)
  const expirationStatus = getExpirationStatus(item.expiration_date)
  
  return (
    <TableRow className="border-border hover:bg-surface transition-colors group cursor-pointer">
      <TableCell className="py-6 px-8">
        <div className="space-y-1">
          <Link href={`/inventory/${item.id}`} className="flex items-center gap-3 font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors hover:underline">
            {isLowStock && <LucideAlertCircle className="h-5 w-5 text-primary animate-pulse" />}
            {expirationStatus?.type === 'expired' && <LucideAlertCircle className="h-5 w-5 text-red-500 animate-pulse" />}
            {expirationStatus?.type === 'expiring' && <LucideAlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />}
            {item.name}
          </Link>
          {(item.lot_number || item.manufacturer) && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-black pl-[32px]">
              {item.lot_number && <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded border border-border/50">Lot: {item.lot_number}</span>}
              {item.manufacturer && <span>Mfg: {item.manufacturer}</span>}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary px-3 py-1 rounded-lg border border-border">
          {item.item_type}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <span className={cn('font-mono font-black text-xl tracking-tighter', isLowStock ? 'text-primary' : 'text-muted-foreground')}>
            {item.current_stock}
            <span className="text-xs font-medium text-muted-foreground ml-1.5 uppercase font-sans tracking-normal">{item.unit}</span>
          </span>
          {isLowStock && <span className="text-[9px] font-black uppercase text-primary/50 tracking-widest">Reorder Required</span>}
          {expirationStatus?.type === 'expired' && (
            <span className="text-[9px] font-black uppercase text-red-500/70 tracking-widest">Expired</span>
          )}
          {expirationStatus?.type === 'expiring' && (
            <span className="text-[9px] font-black uppercase text-yellow-500/70 tracking-widest">Expires in {expirationStatus.daysUntilExpiry} days</span>
          )}
        </div>
      </TableCell>
      {/* Degradation Metrics Column */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getDegradationBadge(item)}
        </div>
      </TableCell>
      <TableCell className="text-right px-8">
        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
          <form action={updateStock as any}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="stock" value={Math.max(0, item.current_stock - 1)} />
            <Button type="submit" variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
              <LucideMinus className="h-5 w-5" />
            </Button>
          </form>
          <form action={updateStock as any}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="stock" value={item.current_stock + 1} />
            <Button type="submit" variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 border border-transparent hover:border-green-500/20">
              <LucidePlus className="h-5 w-5" />
            </Button>
          </form>
          <DeleteConfirmButton action={deleteInventoryItem} hiddenInputs={{ itemId: item.id }} itemName={item.name} />
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Virtual Desktop Table ────────────────────────────────────────────────────

function VirtualDesktopTable({ items }: { items: InventoryItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const ROW_HEIGHT = 81 // px — py-6 = 24px top+bottom + ~33px content

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div className="rounded-2xl border border-border bg-surface backdrop-blur-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-background/50">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-8">Component Identifier</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Classification</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Stock Status</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Quality Metrics</TableHead>
            <TableHead className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-8">Tactical Actions</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      {/* Scrollable virtual body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: '520px' }}
      >
        <Table>
          <TableBody>
            <tr style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vRow => {
                const item = items[vRow.index]
                return (
                  <tr
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    {/* Render as a single-row table to reuse InventoryRow cells cleanly */}
                    <td colSpan={5} className="p-0 border-b border-border">
                      <table className="w-full">
                        <tbody>
                          <InventoryRow item={item} />
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )
              })}
            </tr>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Standard Desktop Table ───────────────────────────────────────────────────

function DesktopTable({ items, query }: { items: InventoryItem[]; query: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface backdrop-blur-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-background/50">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-8">Component Identifier</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Classification</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Stock Status</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Quality Metrics</TableHead>
            <TableHead className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-8">Tactical Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? items.map(item => (
            <InventoryRow key={item.id} item={item} />
          )) : (
            <TableRow>
              <TableCell colSpan={5} className="py-24 text-center">
                <EmptyState query={query} showAddCta />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Public Component ─────────────────────────────────────────────────────────

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <SearchFilter<InventoryItem> items={items} searchKeys={['name', 'item_type']} placeholder="Search inventory by name or type…">
      {(filtered, query) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}{query ? ' found' : ''}
            </p>
            <ExportCSVButton
              data={filtered}
              filename="brewbrain_inventory"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'item_type', label: 'Type' },
                { key: 'current_stock', label: 'Stock' },
                { key: 'unit', label: 'Unit' },
                { key: 'reorder_point', label: 'Reorder Point' },
                { key: 'lot_number', label: 'Lot Number' },
                { key: 'expiration_date', label: 'Expiration Date' },
                { key: 'manufacturer', label: 'Manufacturer' },
              ]}
              className="text-muted-foreground hover:text-foreground border border-border"
            />
          </div>

          <Tabs defaultValue="All" className="w-full max-w-full overflow-hidden gap-0">
            <TabsList className="bg-background/50 border border-border p-1.5 h-auto rounded-2xl mb-6 gap-1 flex w-full overflow-x-auto scrollbar-none">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-black uppercase text-[10px] tracking-widest px-3 md:px-6 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => {
              const catFiltered = category === 'All'
                ? filtered
                : filtered.filter(item => item.item_type === category)

              return (
                <TabsContent key={category} value={category} className="mt-0 focus-visible:outline-none">
                  {/* Desktop: virtualize if large, otherwise normal table */}
                  <div className="hidden md:block">
                    {catFiltered.length > VIRTUAL_THRESHOLD ? (
                      <VirtualDesktopTable items={catFiltered} />
                    ) : (
                      <DesktopTable items={catFiltered} query={query} />
                    )}
                  </div>

                  {/* Mobile: stacked card layout */}
                  <div className="md:hidden space-y-3 pb-20">
                    {catFiltered.length > 0 ? (
                      catFiltered.map(item => (
                        <MobileInventoryCard key={item.id} item={item} />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-surface">
                        <EmptyState query={query} showAddCta />
                      </div>
                    )}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      )}
    </SearchFilter>
  )
}
