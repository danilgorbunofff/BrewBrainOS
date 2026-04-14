'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  LucideHistory, LucideClipboardList, LucideWaves,
  LucidePackageSearch, LucideMic, LucideLoader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityEntry {
  id: string
  type: 'batch' | 'tank' | 'reading' | 'inventory'
  label: string
  detail: string
  timestamp: string
}

type FilterType = 'all' | 'batch' | 'tank' | 'reading' | 'inventory'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'batch', label: 'Batches' },
  { value: 'reading', label: 'Readings' },
  { value: 'tank', label: 'Tanks' },
  { value: 'inventory', label: 'Inventory' },
]

const typeConfig = {
  batch: { icon: LucideClipboardList, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  tank: { icon: LucideWaves, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  reading: { icon: LucideMic, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  inventory: { icon: LucidePackageSearch, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
}

export function ActivityLog({ activities }: { activities: ActivityEntry[] }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [modalEntries, setModalEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async (type: FilterType) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type, limit: '100' })
      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load logs')
      const json = await res.json() as { activities: ActivityEntry[] }
      setModalEntries(json.activities)
    } catch {
      setError('Could not load activity logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpen = useCallback((next: boolean) => {
    setOpen(next)
    if (next) {
      setFilter('all')
      fetchLogs('all')
    }
  }, [fetchLogs])

  const handleFilter = useCallback((type: FilterType) => {
    setFilter(type)
    fetchLogs(type)
  }, [fetchLogs])

  const preview = activities.slice(0, 3)

  return (
    <>
      <Card className="glass border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <LucideHistory className="h-5 w-5 text-primary/60" />
              Activity Log
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
              onClick={() => handleOpen(true)}
            >
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preview.length > 0 ? (
            <div className="space-y-1">
              {preview.map((entry, i) => (
                <ActivityRow key={entry.id} entry={entry} isLast={i === preview.length - 1} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-medium text-center py-6">No recent activity recorded.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col glass border-border p-0 overflow-hidden max-sm:max-w-full max-sm:h-dvh max-sm:rounded-none max-sm:border-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <LucideHistory className="h-5 w-5 text-primary/60" />
              Activity Log
            </DialogTitle>
            <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label="Filter activity by type">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => handleFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-colors border',
                    filter === f.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scrollbar-none">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <LucideLoader2 className="h-6 w-6 animate-spin text-primary/60" />
              </div>
            )}
            {!loading && error && (
              <p className="text-sm text-destructive font-medium text-center py-8">{error}</p>
            )}
            {!loading && !error && modalEntries.length === 0 && (
              <p className="text-sm text-muted-foreground font-medium text-center py-8">No activity recorded for this filter.</p>
            )}
            {!loading && !error && modalEntries.map((entry, i) => (
              <ActivityRow key={entry.id} entry={entry} isLast={i === modalEntries.length - 1} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ActivityRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const config = typeConfig[entry.type]
  const Icon = config.icon
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface transition-colors group">
      <div className="flex flex-col items-center pt-0.5">
        <div className={cn('h-7 w-7 rounded-lg border flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={cn('h-3.5 w-3.5', config.color)} />
        </div>
        {!isLast && (
          <div className="w-px h-full min-h-[1.5rem] bg-secondary mt-1" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{entry.label}</p>
        <p className="text-xs text-muted-foreground font-medium truncate">{entry.detail}</p>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 pt-1">
        {formatRelativeTime(entry.timestamp)}
      </span>
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then

  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
