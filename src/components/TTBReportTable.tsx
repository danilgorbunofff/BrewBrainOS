'use client'

import { useState } from 'react'
import { LucideDownload, LucideFileBarChart, LucideChevronDown, LucideChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batches: any[]
  avgTankCapacity: number
  breweryName: string
  licenseNumber: string | null
}

export function TTBReportTable({ batches, avgTankCapacity, breweryName, licenseNumber }: TTBReportTableProps) {
  const [expanded, setExpanded] = useState(true)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Group batches dynamically on the client so that New Date() respects the local browser timezone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyData: Record<string, MonthlyRow & { monthKey: string, batchesList: any[] }> = {}
  
  for (const batch of batches) {
    const date = new Date(batch.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthLabel, monthKey, totalBatches: 0, completedBatches: 0,
        activeBatches: 0, dumpedBatches: 0, estimatedBBL: 0, gallons: 0, avgOG: 0, avgFG: 0, batchesList: []
      }
    }
    const m = monthlyData[monthKey]
    m.totalBatches++
    m.batchesList.push(batch)

    if (batch.status === 'complete' || batch.status === 'packaging') {
      m.completedBatches++
      m.estimatedBBL += avgTankCapacity
      m.gallons += avgTankCapacity * 31
    }
    if (batch.status === 'fermenting' || batch.status === 'conditioning') m.activeBatches++
    if (batch.status === 'dumped') m.dumpedBatches++
  }

  for (const key of Object.keys(monthlyData)) {
    const m = monthlyData[key]
    const withOG = m.batchesList.filter(b => b.og)
    const withFG = m.batchesList.filter(b => b.fg)
    m.avgOG = withOG.length > 0 ? withOG.reduce((s, b) => s + Number(b.og), 0) / withOG.length : 0
    m.avgFG = withFG.length > 0 ? withFG.reduce((s, b) => s + Number(b.fg), 0) / withFG.length : 0
  }

  const monthlyReport = Object.values(monthlyData).sort((a, b) => b.monthKey.localeCompare(a.monthKey))

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

  // Grand totals - Moved up for use in export functions
  const totals = {
    batches: monthlyReport.reduce((s, m) => s + m.totalBatches, 0),
    completed: monthlyReport.reduce((s, m) => s + m.completedBatches, 0),
    bbl: monthlyReport.reduce((s, m) => s + m.estimatedBBL, 0),
    gallons: monthlyReport.reduce((s, m) => s + m.gallons, 0),
  }

  const exportPDF = async () => {
    if (isExportingPdf) return

    setIsExportingPdf(true)

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])

      const doc = new jsPDF()

      // Title & Header
      doc.setFontSize(22)
      doc.setTextColor(20, 20, 20)
      doc.text('BrewBrain OS', 14, 20)
      
      doc.setFontSize(16)
      doc.setTextColor(60, 60, 60)
      doc.text("Brewer's Report of Operations (TTB 5130.9)", 14, 30)

      // Metadata
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Brewery: ${breweryName}`, 14, 42)
      if (licenseNumber) doc.text(`License: ${licenseNumber}`, 14, 47)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 52)
      doc.text(`Formula: 1 BBL = 31 US Gallons`, 14, 57)

      const tableHeaders = [['Month', 'Batches', 'Completed', 'Active', 'Dumped', 'BBL', 'Gallons', 'Avg OG', 'Avg FG']]
      
      const tableRows = monthlyReport.map(m => [
        m.month,
        m.totalBatches,
        m.completedBatches,
        m.activeBatches,
        m.dumpedBatches || '0',
        m.estimatedBBL.toFixed(1),
        Math.round(m.gallons).toLocaleString(),
        m.avgOG ? m.avgOG.toFixed(3) : '—',
        m.avgFG ? m.avgFG.toFixed(3) : '—'
      ])

      // Add Totals Row
      tableRows.push([
        'GRAND TOTAL',
        totals.batches.toString(),
        monthlyReport.reduce((s, m) => s + m.completedBatches, 0).toString(),
        '-',
        '-',
        totals.bbl.toFixed(1),
        Math.round(totals.gallons).toLocaleString(),
        '-',
        '-'
      ])

      autoTable(doc, {
        startY: 65,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [245, 158, 11], // BrewBrain Primary
          textColor: [255, 255, 255],
          fontStyle: 'bold' 
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          5: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          // Style the last row (Grand Total)
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            // Use a light version of the primary color [254, 245, 230]
            data.cell.styles.fillColor = [254, 245, 230]
          }
        }
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Generated by BrewBrain OS — The Digital Brain for Craft Breweries. Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      doc.save(`TTB-Report-${breweryName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 7)}.pdf`)
    } catch (error) {
      console.error('Failed to export TTB PDF', error)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 group"
        >
          <LucideFileBarChart className="h-4 w-4 text-primary/60" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
            TTB Monthly Production Report
          </p>
          {expanded ? (
            <LucideChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <LucideChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-border text-muted-foreground hover:text-primary hover:border-primary/30 h-8"
          >
            <LucideDownload className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            onClick={exportPDF}
            disabled={isExportingPdf}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-border text-muted-foreground hover:text-primary hover:border-primary/30 h-8"
          >
            <LucideDownload className="h-3.5 w-3.5" />
            {isExportingPdf ? 'Building' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Month', 'Batches', 'Completed', 'Active', 'Dumped', 'BBL', 'Gallons', 'Avg OG', 'Avg FG'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {monthlyReport.length > 0 ? monthlyReport.map((row) => (
                <tr key={row.month} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3 font-bold text-foreground whitespace-nowrap">{row.month}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{row.totalBatches}</td>
                  <td className="px-5 py-3 font-mono text-green-400">{row.completedBatches}</td>
                  <td className="px-5 py-3 font-mono text-primary">{row.activeBatches}</td>
                  <td className="px-5 py-3 font-mono text-red-400">{row.dumpedBatches || '—'}</td>
                  <td className="px-5 py-3 font-mono font-bold text-primary">{row.estimatedBBL.toFixed(1)}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{Math.round(row.gallons)}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{row.avgOG ? row.avgOG.toFixed(3) : '—'}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{row.avgFG ? row.avgFG.toFixed(3) : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground font-medium">
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
                  <td className="px-5 py-3 font-mono font-bold text-foreground">{totals.batches}</td>
                  <td className="px-5 py-3 font-mono font-bold text-green-400">{totals.completed}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 font-mono font-black text-primary text-lg">{totals.bbl.toFixed(1)}</td>
                  <td className="px-5 py-3 font-mono font-bold text-foreground">{Math.round(totals.gallons).toLocaleString()}</td>
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
