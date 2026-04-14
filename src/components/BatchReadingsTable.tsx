'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BatchReading } from '@/types/database'
import { LucideThermometer, LucideChevronLeft, LucideChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZES = [5, 10, 20, 50] as const

interface BatchReadingsTableProps {
  readings: BatchReading[]
  currentPage: number
  pageSize: number
  totalCount: number
}

// Out-of-range color helpers
function phColor(ph: number | null | undefined): string {
  if (ph == null) return ''
  if (ph < 4.0 || ph > 5.5) return 'text-red-400 font-black'
  if (ph < 4.2 || ph > 5.3) return 'text-amber-400 font-bold'
  return 'text-green-400'
}

function doColor(do_: number | null | undefined): string {
  if (do_ == null) return ''
  if (do_ > 0.5) return 'text-red-400 font-black'
  if (do_ > 0.3) return 'text-amber-400 font-bold'
  return 'text-green-400'
}

function pressureColor(psi: number | null | undefined): string {
  if (psi == null) return ''
  if (psi > 20) return 'text-red-400 font-black'
  if (psi > 15) return 'text-amber-400 font-bold'
  return ''
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BatchReadingsTable({ readings, currentPage, pageSize, totalCount }: BatchReadingsTableProps) {
  const router = useRouter()
  const pathname = usePathname()

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)

  function navigate(page: number, limit: number) {
    router.push(`${pathname}?page=${page}&limit=${limit}`, { scroll: false })
  }

  if (totalCount === 0) {
    return (
      <div className="py-16 text-center">
        <LucideThermometer className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-bold text-muted-foreground">No readings yet</p>
        <p className="text-xs text-muted-foreground font-medium mt-1">
          Use the Manual Reading form above to add sensor data.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Date', 'Temp (°C)', 'Gravity', 'pH', 'DO (ppm)', 'Pressure (PSI)', 'Notes'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {readings.map((r) => (
              <tr key={r.id} className="hover:bg-surface-hover transition-colors group">
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-foreground">
                  {r.temperature != null ? r.temperature.toFixed(1) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-foreground">
                  {r.gravity != null ? r.gravity.toFixed(3) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className={cn('px-4 py-3 font-mono', phColor(r.ph))}>
                  {r.ph != null ? r.ph.toFixed(2) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className={cn('px-4 py-3 font-mono', doColor(r.dissolved_oxygen))}>
                  {r.dissolved_oxygen != null
                    ? r.dissolved_oxygen.toFixed(2)
                    : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className={cn('px-4 py-3 font-mono', pressureColor(r.pressure))}>
                  {r.pressure != null ? r.pressure.toFixed(1) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                  {r.notes && r.notes !== 'No notes.' ? r.notes : <span className="opacity-30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-border">
        {readings.map((r) => (
          <div key={r.id} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{formatDate(r.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temp</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {r.temperature != null ? `${r.temperature.toFixed(1)}°` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gravity</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {r.gravity != null ? r.gravity.toFixed(3) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">pH</span>
                <span className={cn('font-mono text-sm', phColor(r.ph))}>
                  {r.ph != null ? r.ph.toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DO</span>
                <span className={cn('font-mono text-sm', doColor(r.dissolved_oxygen))}>
                  {r.dissolved_oxygen != null ? r.dissolved_oxygen.toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PSI</span>
                <span className={cn('font-mono text-sm', pressureColor(r.pressure))}>
                  {r.pressure != null ? r.pressure.toFixed(1) : '—'}
                </span>
              </div>
            </div>
            {r.notes && r.notes !== 'No notes.' && (
              <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => navigate(1, Number(val))}
          >
            <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {rangeStart}–{rangeEnd} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => navigate(currentPage - 1, pageSize)}
              aria-label="Previous page"
            >
              <LucideChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => navigate(currentPage + 1, pageSize)}
              aria-label="Next page"
            >
              <LucideChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
