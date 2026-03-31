import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideHistory, LucideClipboardList, LucideWaves, LucidePackageSearch, LucideMic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityEntry {
  id: string
  type: 'batch' | 'tank' | 'reading' | 'inventory'
  label: string
  detail: string
  timestamp: string
}

const typeConfig = {
  batch: { icon: LucideClipboardList, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  tank: { icon: LucideWaves, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  reading: { icon: LucideMic, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  inventory: { icon: LucidePackageSearch, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
}

export function ActivityLog({ activities }: { activities: ActivityEntry[] }) {
  return (
    <Card className="glass border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <LucideHistory className="h-5 w-5 text-primary/60" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((entry, i) => {
              const config = typeConfig[entry.type]
              const Icon = config.icon
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={cn('h-7 w-7 rounded-lg border flex items-center justify-center shrink-0', config.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', config.color)} />
                    </div>
                    {i < activities.length - 1 && (
                      <div className="w-px h-full min-h-[1.5rem] bg-white/5 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{entry.label}</p>
                    <p className="text-xs text-zinc-600 font-medium truncate">{entry.detail}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-700 shrink-0 pt-1">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 font-medium text-center py-6">No recent activity recorded.</p>
        )}
      </CardContent>
    </Card>
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
