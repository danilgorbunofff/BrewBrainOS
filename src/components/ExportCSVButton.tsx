'use client'

import { Button } from '@/components/ui/button'
import { LucideDownload } from 'lucide-react'

interface ExportCSVButtonProps<T extends object> {
  data: T[]
  filename: string
  columns: { key: keyof T & string; label: string }[]
  className?: string
}

export function ExportCSVButton<T extends object>({ data, filename, columns, className }: ExportCSVButtonProps<T>) {
  const handleExport = () => {
    if (data.length === 0) return

    const header = columns.map(c => c.label).join(',')
    const rows = data.map(row =>
      columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined) return ''
        const str = String(val)
        // Escape commas and quotes in CSV
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={data.length === 0}
      className={className}
      title="Export as CSV"
    >
      <LucideDownload className="h-4 w-4 mr-1.5" />
      Export
    </Button>
  )
}
