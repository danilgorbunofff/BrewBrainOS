'use client'

import { useEffect, useState } from 'react'
import { getReorderAlerts, getReorderAlertsSummary } from '@/app/actions/reorder-actions'
import ReorderAlertCard from './ReorderAlertCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react'

interface ReorderAlertsDashboardProps {
  breweryId: string
}

interface ReorderAlert {
  id: string
  alert_type: string
  severity: string
  status: string
  current_quantity: number
  reorder_point: number
  units_to_reorder?: number
  estimated_stockout_days?: number
  created_at: string
  acknowledged_at?: string
  inventory_item: {
    id: string
    name: string
    unit: string
    supplier_id?: string
  }
}

export default function ReorderAlertsDashboard({ breweryId }: ReorderAlertsDashboardProps) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'open' | 'acknowledged' | 'all'>('open')
  const [summary, setSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0 })

  useEffect(() => {
    loadAlerts()
    loadSummary()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breweryId, filter])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const data = await getReorderAlerts(breweryId, filter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAlerts((data as any) || [])
    } catch (error) {
      console.error('Failed to load reorder alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const data = await getReorderAlertsSummary(breweryId)
      setSummary(data)
    } catch (error) {
      console.error('Failed to load alert summary:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadAlerts(), loadSummary()])
    } finally {
      setRefreshing(false)
    }
  }

  const handleAlertStatusChange = () => {
    loadAlerts()
    loadSummary()
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true
    return alert.status === filter
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  const hasCritical = summary.critical > 0
  const hasWarning = summary.warning > 0

  return (
    <Card className={hasCritical ? 'border-red-500/30 bg-red-500/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {hasCritical && <AlertCircle className="h-5 w-5 text-red-600" />}
            {hasWarning && !hasCritical && <AlertCircle className="h-5 w-5 text-yellow-600" />}
            {!hasCritical && !hasWarning && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
            <CardTitle>Reorder Alerts</CardTitle>
          </div>
          <CardDescription className="mt-2">
            {summary.total === 0 ? (
              <span className="text-green-600 dark:text-green-400 font-medium">All inventory levels healthy</span>
            ) : (
              <span>
                <span className={summary.critical > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                  {summary.critical} critical
                </span>
                {' • '}
                <span className={summary.warning > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                  {summary.warning} warning
                </span>
                {' • '}
                {summary.info} info
              </span>
            )}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {summary.total === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-green-500/20 bg-green-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500/80" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">No reorder alerts</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">All items are at healthy stock levels</p>
          </div>
        ) : (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="open" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Open
                {alerts.filter((a) => a.status === 'open').length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    {alerts.filter((a) => a.status === 'open').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Acknowledged
                {alerts.filter((a) => a.status === 'acknowledged').length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-gray-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    {alerts.filter((a) => a.status === 'acknowledged').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Info className="h-4 w-4" />
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-3 mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mb-2"></div>
                    <p className="text-sm text-gray-600">Loading alerts...</p>
                  </div>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    {filter === 'all'
                      ? 'No reorder alerts'
                      : filter === 'open'
                        ? 'No open alerts'
                        : 'No acknowledged alerts'}
                  </p>
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredAlerts.map((alert: any) => (
                  <ReorderAlertCard
                    key={alert.id}
                    alert={alert}
                    onStatusChange={handleAlertStatusChange}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
