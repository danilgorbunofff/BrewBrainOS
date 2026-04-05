'use client'

import { BatchReading } from '@/types/database'
import { LucideThermometer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BatchReadingsTableProps {
  readings: BatchReading[]
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

export function BatchReadingsTable({ readings }: BatchReadingsTableProps) {
  if (!readings || readings.length === 0) {
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
    <div className="overflow-x-auto">
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
  )
}
