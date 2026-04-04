'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { acknowledgeReorderAlert, resolveReorderAlert } from '@/app/actions/reorder-actions'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  name: string
  unit_type: string
  supplier_id?: string
}

interface ReorderAlertCardProps {
  alert: {
    id: string
    alert_type: 'reorder_point_hit' | 'critical_low' | 'stockout_imminent'
    severity: 'info' | 'warning' | 'critical'
    status: 'open' | 'acknowledged' | 'resolved'
    current_quantity: number
    reorder_point: number
    units_to_reorder?: number
    estimated_stockout_days?: number
    created_at: string
    acknowledged_at?: string
    inventory_item: InventoryItem
  }
  onStatusChange?: () => void
}

const severityConfig = {
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: 'ℹ️',
    badge: 'secondary',
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    icon: '⚠️',
    badge: 'secondary',
  },
  critical: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    icon: '🚨',
    badge: 'destructive',
  },
} as const

const alertTypeLabels = {
  reorder_point_hit: 'Reorder Point Hit',
  critical_low: 'Critical Low Stock',
  stockout_imminent: 'Stockout Imminent',
} as const

export default function ReorderAlertCard({ alert, onStatusChange }: ReorderAlertCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const config = severityConfig[alert.severity]

  const daysText =
    alert.estimated_stockout_days === 0
      ? 'OUT OF STOCK NOW'
      : alert.estimated_stockout_days
        ? `${alert.estimated_stockout_days} days left`
        : ''

  const percentageOfReorder = ((alert.current_quantity / alert.reorder_point) * 100).toFixed(0)

  const handleAcknowledge = async () => {
    setIsLoading(true)
    try {
      await acknowledgeReorderAlert(alert.id)
      toast.success('Alert acknowledged')
      onStatusChange?.()
    } catch (error) {
      toast.error('Failed to acknowledge alert')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async () => {
    setIsLoading(true)
    try {
      await resolveReorderAlert(alert.id, 'Item has been reordered')
      toast.success('Alert resolved')
      onStatusChange?.()
    } catch (error) {
      toast.error('Failed to resolve alert')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card
      className={`border ${config.borderColor} ${config.bgColor} transition-all hover:shadow-md`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{config.icon}</span>
              <CardTitle className="text-lg">{alert.inventory_item.name}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {alertTypeLabels[alert.alert_type]}
            </CardDescription>
          </div>
          <Badge
            variant={config.badge as 'destructive' | 'secondary'}
            className="whitespace-nowrap"
          >
            {alert.severity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stock levels */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-white/50 p-3">
            <p className="text-xs text-gray-600 font-medium">Current Stock</p>
            <p className="text-lg font-bold mt-1">
              {alert.current_quantity}
              <span className="text-xs text-gray-500 ml-1">{alert.inventory_item.unit_type}</span>
            </p>
          </div>
          <div className="rounded-md bg-white/50 p-3">
            <p className="text-xs text-gray-600 font-medium">Reorder Point</p>
            <p className="text-lg font-bold mt-1">
              {alert.reorder_point}
              <span className="text-xs text-gray-500 ml-1">{alert.inventory_item.unit_type}</span>
            </p>
          </div>
          <div className="rounded-md bg-white/50 p-3">
            <p className="text-xs text-gray-600 font-medium">% of Target</p>
            <p className="text-lg font-bold mt-1 text-red-600">{percentageOfReorder}%</p>
          </div>
        </div>

        {/* Suggested order quantity */}
        {alert.units_to_reorder && (
          <div className="rounded-lg border-2 border-dashed border-current/20 bg-white p-3">
            <p className="text-xs font-medium text-gray-600 mb-1">Suggested Order</p>
            <p className="text-base font-semibold">
              {alert.units_to_reorder} {alert.inventory_item.unit_type}
            </p>
          </div>
        )}

        {/* Days remaining warning */}
        {daysText && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 ${config.bgColor} ${config.borderColor} border`}
          >
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className={`text-sm font-semibold ${config.textColor}`}>{daysText}</span>
          </div>
        )}

        {/* Status badge */}
        {alert.status === 'acknowledged' && alert.acknowledged_at && (
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded px-2 py-1">
            <CheckCircle className="h-3 w-3" />
            Acknowledged {new Date(alert.acknowledged_at).toLocaleDateString()}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {alert.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledge}
              disabled={isLoading}
              className="flex-1"
            >
              Mark as Seen
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleResolve}
            disabled={isLoading}
            className="flex-1"
          >
            <CheckCircle className="mr-1.5 h-4 w-4" />
            {alert.status === 'resolved' ? 'Resolved' : 'Mark Ordered'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
