'use client'

import { useState } from 'react'
import { LucideDownload, LucideFileBarChart, LucideChevronDown, LucideChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MonthlyRow {
  month: string
  totalBatches: number
  completedBatches: number
  activeBatches: number
  dumpedBatches: number
  estimatedBBL: number
  gallons: number
  avgOG: number
  avgFG: number
}

interface TTBReportTableProps {
  monthlyReport: MonthlyRow[]
  breweryName: string
  licenseNumber: string | null
}

export function TTBReportTable({ monthlyReport, breweryName, licenseNumber }: TTBReportTableProps) {
  const [expanded, setExpanded] = useState(true)

  const exportCSV = () => {
    const headers = [
      'Month',
      'Total Batches',
      'Completed',
      'Active',
      'Dumped',
      'Production (BBL)',
      'Production (Gallons)',
      'Avg OG',
      'Avg FG',
    ]

    const rows = monthlyReport.map(m => [
      m.month,
      m.totalBatches,
      m.completedBatches,
      m.activeBatches,
      m.dumpedBatches,
      m.estimatedBBL.toFixed(1),
      Math.round(m.gallons),
      m.avgOG ? m.avgOG.toFixed(3) : '—',
      m.avgFG ? m.avgFG.toFixed(3) : '—',
    ])

    // Add grand total row
    const totals = {
      batches: monthlyReport.reduce((s, m) => s + m.totalBatches, 0),
      completed: monthlyReport.reduce((s, m) => s + m.completedBatches, 0),
      active: monthlyReport.reduce((s, m) => s + m.activeBatches, 0),
      dumped: monthlyReport.reduce((s, m) => s + m.dumpedBatches, 0),
      bbl: monthlyReport.reduce((s, m) => s + m.estimatedBBL, 0),
      gallons: monthlyReport.reduce((s, m) => s + m.gallons, 0),
    }

    rows.push([
      'TOTAL',
      totals.batches,
      totals.completed,
      totals.active,
      totals.dumped,
      totals.bbl.toFixed(1),
      Math.round(totals.gallons),
      '',
      '',
    ])

    // Build CSV with header info
    const csvHeader = [
      `TTB Form 5130.9 — Brewer's Report of Operations`,
      `Brewery: ${breweryName}`,
      licenseNumber ? `License: ${licenseNumber}` : '',
      `Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      `Formula: 1 BBL = 31 US Gallons`,
      '',
    ].filter(Boolean)

    const csv = [
      ...csvHeader,
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TTB-Report-${breweryName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 7)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Grand totals
  const totals = {
    batches: monthlyReport.reduce((s, m) => s + m.totalBatches, 0),
    completed: monthlyReport.reduce((s, m) => s + m.completedBatches, 0),
    bbl: monthlyReport.reduce((s, m) => s + m.estimatedBBL, 0),
    gallons: monthlyReport.reduce((s, m) => s + m.gallons, 0),
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 group"
        >
          <LucideFileBarChart className="h-4 w-4 text-primary/60" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
            TTB Monthly Production Report
          </p>
          {expanded ? (
            <LucideChevronUp className="h-3.5 w-3.5 text-zinc-700" />
          ) : (
            <LucideChevronDown className="h-3.5 w-3.5 text-zinc-700" />
          )}
        </button>
        <Button
          onClick={exportCSV}
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 border-white/10 text-zinc-400 hover:text-primary hover:border-primary/30 h-8"
        >
          <LucideDownload className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Month', 'Batches', 'Completed', 'Active', 'Dumped', 'BBL', 'Gallons', 'Avg OG', 'Avg FG'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthlyReport.length > 0 ? monthlyReport.map((row, i) => (
                <tr key={row.month} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-bold text-zinc-300 whitespace-nowrap">{row.month}</td>
                  <td className="px-5 py-3 font-mono text-zinc-400">{row.totalBatches}</td>
                  <td className="px-5 py-3 font-mono text-green-400">{row.completedBatches}</td>
                  <td className="px-5 py-3 font-mono text-primary">{row.activeBatches}</td>
                  <td className="px-5 py-3 font-mono text-red-400">{row.dumpedBatches || '—'}</td>
                  <td className="px-5 py-3 font-mono font-bold text-primary">{row.estimatedBBL.toFixed(1)}</td>
                  <td className="px-5 py-3 font-mono text-zinc-400">{Math.round(row.gallons)}</td>
                  <td className="px-5 py-3 font-mono text-zinc-500">{row.avgOG ? row.avgOG.toFixed(3) : '—'}</td>
                  <td className="px-5 py-3 font-mono text-zinc-500">{row.avgFG ? row.avgFG.toFixed(3) : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-zinc-700 font-medium">
                    No batch data yet. Create batches to generate TTB production reports.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total */}
            {monthlyReport.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/[0.02]">
                  <td className="px-5 py-3 font-black text-primary text-xs uppercase tracking-widest">Grand Total</td>
                  <td className="px-5 py-3 font-mono font-bold text-zinc-300">{totals.batches}</td>
                  <td className="px-5 py-3 font-mono font-bold text-green-400">{totals.completed}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 font-mono font-black text-primary text-lg">{totals.bbl.toFixed(1)}</td>
                  <td className="px-5 py-3 font-mono font-bold text-zinc-300">{Math.round(totals.gallons).toLocaleString()}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
