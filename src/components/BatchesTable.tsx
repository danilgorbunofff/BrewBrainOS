'use client'

import Link from 'next/link'
import { SearchFilter } from '@/components/SearchFilter'
import { ExportCSVButton } from '@/components/ExportCSVButton'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { LucideClipboardList } from 'lucide-react'
import { deleteBatch } from '@/app/(app)/batches/actions'

interface Batch {
  id: string
  recipe_name: string
  status: string
  og: number | null
  fg: number | null
  created_at: string
}

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

          <div className="glass border-white/5 overflow-hidden rounded-2xl">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 px-6">Recipe Identifier</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Initiated</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Target OG</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Current FG</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 text-right px-6">Cycle Status</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(batch => (
                  <TableRow key={batch.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <TableCell className="py-6 px-6">
                      <Link href={`/batches/${batch.id}`} className="flex flex-col">
                        <span className="font-black text-lg tracking-tight text-white group-hover:text-primary transition-colors">
                          {batch.recipe_name}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono uppercase">ID: {batch.id.slice(0, 8)}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-400 font-medium">{new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell className="text-zinc-300 font-mono italic">{batch.og?.toFixed(3) || '--'}</TableCell>
                    <TableCell className="text-primary font-mono font-black text-lg drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                      {batch.fg?.toFixed(3) || '--'}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Link href={`/batches/${batch.id}`}>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                          batch.status === 'fermenting' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-zinc-800 text-zinc-500 border border-white/5'
                        )}>
                          {batch.status === 'fermenting' && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                          {batch.status}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DeleteConfirmButton
                        action={deleteBatch}
                        hiddenInputs={{ batchId: batch.id }}
                        itemName={batch.recipe_name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="max-w-xs mx-auto space-y-2">
                        <LucideClipboardList className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-400">{query ? 'No matches' : 'Empty Logbook'}</h3>
                        <p className="text-sm text-zinc-600 font-medium italic">
                          {query ? 'Try a different search term.' : 'Your production records will appear here as soon as you initiate your first batch cycle.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </SearchFilter>
  )
}
