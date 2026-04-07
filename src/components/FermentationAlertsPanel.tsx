'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FermentationAlert } from '@/types/database'
import { acknowledgeAlert } from '@/app/(app)/batches/[id]/actions'
import { cn } from '@/lib/utils'
import {
  LucideAlertTriangle,
  LucideAlertOctagon,
  LucideCheckCircle2,
  LucideThermometer,
  LucideDroplets,
  LucideFlaskConical,
  LucideGauge,
  LucideActivity,
  LucideZap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FermentationAlertsPanelProps {
  alerts: FermentationAlert[]
  batchId: string
}

const ALERT_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  stuck_fermentation:  { label: 'Stuck Fermentation',   icon: LucideActivity },
  temperature_deviation: { label: 'Temperature Deviation', icon: LucideThermometer },
  ph_out_of_range:     { label: 'pH Out of Range',       icon: LucideFlaskConical },
  do_spike:            { label: 'DO Spike',               icon: LucideDroplets },
  over_pressure:       { label: 'Over Pressure',          icon: LucideGauge },
  glycol_failure:      { label: 'Glycol Failure',         icon: LucideZap },
}

export function FermentationAlertsPanel({ alerts, batchId }: FermentationAlertsPanelProps) {
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const active = alerts.filter((a) => a.status === 'active')
  const acknowledged = alerts.filter((a) => a.status === 'acknowledged')

  const handleAcknowledge = (alertId: string) => {
    setPendingAlertId(alertId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('alertId', alertId)
        formData.set('batchId', batchId)

        const result = await acknowledgeAlert(formData)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to acknowledge alert'
        toast.error(message)
      } finally {
        setPendingAlertId(null)
      }
    })
  }

  return (
    <Card className="glass border-border overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
          <LucideAlertTriangle className="h-5 w-5 text-amber-400" />
          Fermentation Alerts
          {active.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              {active.length} Active
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {active.length === 0 && acknowledged.length === 0 ? (
          <div className="py-16 text-center">
            <LucideCheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-green-400">All parameters nominal</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              No active fermentation alerts detected.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Active alerts */}
            {active.map((alert) => {
              const meta = ALERT_TYPE_META[alert.alert_type] ?? {
                label: alert.alert_type,
                icon: LucideAlertTriangle,
              }
              const Icon = meta.icon
              const isCritical = alert.severity === 'critical'

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-4 px-6 py-4 transition-colors',
                    isCritical ? 'bg-red-500/5' : 'bg-amber-400/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border',
                      isCritical
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-amber-400/10 border-amber-400/20'
                    )}
                  >
                    {isCritical ? (
                      <LucideAlertOctagon className="h-4 w-4 text-red-400" />
                    ) : (
                      <Icon className="h-4 w-4 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                          isCritical
                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                            : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-sm font-black text-foreground">{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {alert.message}
                    </p>
                    {alert.actual_value != null && alert.threshold_value != null && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">
                        Value: <span className="text-foreground">{alert.actual_value}</span>
                        {' / '}Threshold: <span className="text-foreground">{alert.threshold_value}</span>
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending && pendingAlertId === alert.id}
                    onClick={() => handleAcknowledge(alert.id)}
                    className="shrink-0 text-xs font-bold border-border hover:bg-secondary"
                  >
                    {isPending && pendingAlertId === alert.id ? 'Acknowledging…' : 'Acknowledge'}
                  </Button>
                </div>
              )
            })}

            {/* Acknowledged alerts (collapsed/dimmed) */}
            {acknowledged.map((alert) => {
              const meta = ALERT_TYPE_META[alert.alert_type] ?? {
                label: alert.alert_type,
                icon: LucideAlertTriangle,
              }
              return (
                <div key={alert.id} className="flex items-start gap-4 px-6 py-3 opacity-40">
                  <div className="mt-0.5 h-6 w-6 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                    <LucideCheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground line-through">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">Acknowledged</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
