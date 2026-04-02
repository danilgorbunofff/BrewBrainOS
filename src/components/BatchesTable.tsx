'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SearchFilter } from '@/components/SearchFilter'
import { ExportCSVButton } from '@/components/ExportCSVButton'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddBatchForm } from '@/components/AddBatchForm'
import { LucideFlaskConical, LucideChevronRight, LucidePlusCircle } from 'lucide-react'
import { deleteBatch } from '@/app/(app)/batches/actions'

interface Batch {
  id: string
  recipe_name: string
  status: string
  og: number | null
  fg: number | null
  created_at: string
}

const VIRTUAL_THRESHOLD = 100
const ROW_HEIGHT = 89 // py-6 ≈ 24px × 2 + ~41px content

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyLogbook({ query }: { query: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-xs mx-auto space-y-2 text-center py-4">
      <div className="relative mx-auto mb-6 h-16 w-16">
        <div className="absolute inset-0 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="relative h-16 w-16 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-xl">
          <LucideFlaskConical className="h-7 w-7 text-zinc-600" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-zinc-400">{query ? 'No matches' : 'Empty Logbook'}</h3>
      <p className="text-sm text-zinc-600 font-medium italic">
        {query
          ? 'Try a different search term.'
          : 'Your production records will appear here once you initiate your first batch cycle.'}
      </p>
      {!query && (
        <div className="pt-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all">
                <LucidePlusCircle className="h-4 w-4" />
                Start a Batch
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl border-white/5 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white">Start a New Batch</DialogTitle>
                <DialogDescription className="text-zinc-400 font-medium">
                  Enter the recipe and target original gravity to initiate a new batch cycle.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 flex justify-center">
                <AddBatchForm onSuccess={() => setOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}

// ─── Desktop Row ─────────────────────────────────────────────────────────────

function BatchRow({ batch }: { batch: Batch }) {
  const isActive = batch.status === 'fermenting'
  return (
    <TableRow className="border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
      <TableCell className="py-6 px-6">
        <Link href={`/batches/${batch.id}`} className="flex flex-col">
          <span className="font-black text-lg tracking-tight text-white group-hover:text-primary transition-colors">
            {batch.recipe_name}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono uppercase">ID: {batch.id.slice(0, 8)}</span>
        </Link>
      </TableCell>
      <TableCell className="text-zinc-400 font-medium">
        {new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </TableCell>
      <TableCell className="text-zinc-300 font-mono italic">{batch.og?.toFixed(3) || '--'}</TableCell>
      <TableCell className="text-primary font-mono font-black text-lg drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
        {batch.fg?.toFixed(3) || '--'}
      </TableCell>
      <TableCell className="text-right px-6">
        <Link href={`/batches/${batch.id}`}>
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
            isActive
              ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
              : 'bg-zinc-800 text-zinc-500 border border-white/5'
          )}>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
            {batch.status}
          </span>
        </Link>
      </TableCell>
      <TableCell className="text-right pr-4">
        <DeleteConfirmButton action={deleteBatch} hiddenInputs={{ batchId: batch.id }} itemName={batch.recipe_name} />
      </TableCell>
    </TableRow>
  )
}

// ─── Virtual Desktop Table ────────────────────────────────────────────────────

function VirtualDesktopTable({ batches }: { batches: Batch[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: batches.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const headerCells = (
    <TableRow className="border-white/5 hover:bg-transparent">
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 px-6">Recipe Identifier</TableHead>
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Initiated</TableHead>
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Target OG</TableHead>
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Current FG</TableHead>
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 text-right px-6">Cycle Status</TableHead>
      <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 w-10" />
    </TableRow>
  )

  return (
    <div className="glass border-white/5 overflow-hidden rounded-2xl">
      <Table>
        <TableHeader className="bg-zinc-950/50">{headerCells}</TableHeader>
      </Table>
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '520px' }}>
        <Table>
          <TableBody>
            <tr style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vRow => {
                const batch = batches[vRow.index]
                return (
                  <tr
                    key={batch.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    <td colSpan={6} className="p-0 border-b border-white/5">
                      <table className="w-full">
                        <tbody>
                          <BatchRow batch={batch} />
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

function DesktopTable({ batches, query }: { batches: Batch[]; query: string }) {
  return (
    <div className="glass border-white/5 overflow-hidden rounded-2xl hidden md:block">
      <Table>
        <TableHeader className="bg-zinc-950/50">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 px-6">Recipe Identifier</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Initiated</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Target OG</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Current FG</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 text-right px-6">Cycle Status</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map(batch => (
            <BatchRow key={batch.id} batch={batch} />
          ))}
          {batches.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-24">
                <EmptyLogbook query={query} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Public Component ─────────────────────────────────────────────────────────

export function BatchesTable({ batches }: { batches: Batch[] }) {
  return (
    <SearchFilter
      items={batches}
      searchKeys={['recipe_name', 'status']}
      placeholder="Search batches by name or status…"
    >
      {(filtered, query) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
              {filtered.length} {filtered.length === 1 ? 'batch' : 'batches'}{query ? ' found' : ''}
            </p>
            <ExportCSVButton
              data={filtered}
              filename="brewbrain_batches"
              columns={[
                { key: 'recipe_name', label: 'Recipe' },
                { key: 'status', label: 'Status' },
                { key: 'og', label: 'OG' },
                { key: 'fg', label: 'FG' },
                { key: 'created_at', label: 'Created' },
              ]}
              className="text-zinc-600 hover:text-white border border-white/5"
            />
          </div>

          {/* ── Desktop Table (md+) — virtualise when large ── */}
          <div className="hidden md:block">
            {filtered.length > VIRTUAL_THRESHOLD ? (
              <VirtualDesktopTable batches={filtered} />
            ) : (
              <DesktopTable batches={filtered} query={query} />
            )}
          </div>

          {/* ── Mobile Card Layout (<md) ── */}
          <div className="md:hidden space-y-3 pb-20">
            {filtered.length === 0 ? (
              <div className="glass border-white/5 rounded-2xl py-16 text-center">
                <EmptyLogbook query={query} />
              </div>
            ) : (
              filtered.map(batch => {
                const isActive = batch.status === 'fermenting'
                return (
                  <div key={batch.id} className="glass border-white/5 rounded-2xl overflow-hidden">
                    <Link href={`/batches/${batch.id}`} className="block p-4 active:bg-white/[0.03] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base tracking-tight text-white truncate">{batch.recipe_name}</h3>
                          <p className="text-[10px] text-zinc-600 font-mono uppercase mt-0.5">ID: {batch.id.slice(0, 8)}</p>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                            : 'bg-zinc-800 text-zinc-500 border border-white/5'
                        )}>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                          {batch.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 mb-0.5">Date</p>
                          <p className="text-zinc-400 font-medium text-xs truncate">
                            {new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 mb-0.5">OG</p>
                          <p className="text-zinc-300 font-mono italic text-xs">{batch.og?.toFixed(3) || '--'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 mb-0.5">FG</p>
                          <p className="text-primary font-mono font-black text-sm drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                            {batch.fg?.toFixed(3) || '--'}
                          </p>
                        </div>
                        <LucideChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
                      </div>
                    </Link>
                    <div className="flex items-center justify-end px-4 py-2 border-t border-white/5 bg-zinc-950/30">
                      <DeleteConfirmButton action={deleteBatch} hiddenInputs={{ batchId: batch.id }} itemName={batch.recipe_name} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </SearchFilter>
  )
}
