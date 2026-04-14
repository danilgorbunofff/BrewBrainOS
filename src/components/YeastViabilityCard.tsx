'use client'

import { useState } from 'react'
import { logYeastViability } from '@/app/(app)/batches/[id]/actions'
import { YeastLog } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LucideTestTube2, LucideLoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatShortDate } from '@/lib/date-format'

interface YeastViabilityCardProps {
  batchId: string
  yeastLogs: YeastLog[]
}

function viabilityColor(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted-foreground'
  if (pct >= 85) return 'text-green-400'
  if (pct >= 70) return 'text-amber-400'
  return 'text-red-400'
}

function viabilityLabel(pct: number | null | undefined): string {
  if (pct == null) return '—'
  if (pct >= 85) return 'Healthy'
  if (pct >= 70) return 'Marginal'
  return 'Poor'
}

function viabilityBgColor(pct: number | null | undefined): string {
  if (pct == null) return 'bg-secondary border-border'
  if (pct >= 85) return 'bg-green-400/10 border-green-400/20'
  if (pct >= 70) return 'bg-amber-400/10 border-amber-400/20'
  return 'bg-red-500/10 border-red-500/20'
}

export function YeastViabilityCard({ batchId, yeastLogs }: YeastViabilityCardProps) {
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const latest = yeastLogs[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setStatus('idle')

    const formData = new FormData(e.currentTarget)
    const result = await logYeastViability(formData)

    setPending(false)
    if (result.success) {
      setStatus('success')
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('error')
      setErrorMessage(result.error || 'Failed to log')
    }
  }

  return (
    <Card className="glass border-border overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <LucideTestTube2 className="h-5 w-5 text-primary/60" />
          Yeast Viability
          {latest?.viability_pct != null && (
            <span
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
                viabilityBgColor(latest.viability_pct),
                viabilityColor(latest.viability_pct)
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {viabilityLabel(latest.viability_pct)} — {latest.viability_pct.toFixed(1)}%
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="py-6 space-y-6">
        {/* Latest metrics */}
        {latest && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Cell Density', value: latest.cell_density != null ? `${latest.cell_density}M/mL` : '—' },
              { label: 'Viability', value: latest.viability_pct != null ? `${latest.viability_pct.toFixed(1)}%` : '—', color: viabilityColor(latest.viability_pct) },
              { label: 'Pitch Rate', value: latest.pitch_rate != null ? `${latest.pitch_rate} M/mL/°P` : '—' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-secondary/40 rounded-xl border border-border p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                <p className={cn('font-mono font-black text-lg text-foreground', color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Latest log notes */}
        {latest?.notes && (
          <p className="text-xs text-muted-foreground">{latest.notes}</p>
        )}

        {/* Log new entry */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="batchId" value={batchId} />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Log New Entry</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Cell Density (M/mL)
              </Label>
              <Input
                name="cell_density"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 200"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Viability (%)
              </Label>
              <Input
                name="viability_pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g. 92"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pitch Rate
              </Label>
              <Input
                name="pitch_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 0.75"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes</Label>
              <Input name="notes" type="text" placeholder="Optional notes…" className="font-mono" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending} className="font-bold">
              {pending ? (
                <>
                  <LucideLoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  Logging…
                </>
              ) : (
                'Log Viability'
              )}
            </Button>
            {status === 'success' && (
              <span className="text-xs font-bold text-green-400 animate-in fade-in">✓ Logged</span>
            )}
            {status === 'error' && (
              <span className="text-xs font-bold text-red-400">{errorMessage}</span>
            )}
          </div>
        </form>

        {/* History */}
        {yeastLogs.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">History</p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {yeastLogs.slice(1, 6).map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-bold', viabilityColor(log.viability_pct))}>
                      {log.viability_pct != null ? `${log.viability_pct.toFixed(1)}%` : '—'}
                    </span>
                    {log.cell_density != null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.cell_density}M/mL
                      </span>
                    )}
                    {log.notes && (
                      <span className="text-xs text-muted-foreground">{log.notes}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatShortDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
