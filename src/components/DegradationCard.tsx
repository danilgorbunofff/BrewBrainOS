'use client'

import { useState } from 'react'
import { InventoryItem, StorageCondition } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  AlertCircle,
  Droplet,
  Leaf,
  TrendingDown,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { getDegradationHealthStatus, generateDegradationAlerts } from '@/lib/degradation'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateStorageCondition, updateDegradationMetrics } from '@/app/(app)/inventory/actions'
import { cn } from '@/lib/utils'

interface DegradationCardProps {
  item: InventoryItem
  onUpdate?: (updatedItem: InventoryItem) => void
}

export function DegradationCard({ item, onUpdate }: DegradationCardProps) {
  const [isEditingStorage, setIsEditingStorage] = useState(false)
  const [newStorageCondition, setNewStorageCondition] = useState<StorageCondition>(
    (item.storage_condition as StorageCondition) || 'cool_dry'
  )
  const [isUpdating, setIsUpdating] = useState(false)

  const healthStatus = getDegradationHealthStatus(
    item.hsi_current,
    item.grain_moisture_current,
    item.ppg_initial && item.ppg_current ? ((item.ppg_initial - item.ppg_current) / item.ppg_initial) * 100 : 0
  )

  const alerts = generateDegradationAlerts({
    item_type: item.item_type,
    hsi_current: item.hsi_current,
    grain_moisture_current: item.grain_moisture_current,
    ppg_current: item.ppg_current,
    ppg_initial: item.ppg_initial,
  })

  const hsiPercentage = item.hsi_current ? (item.hsi_current / 100) * 100 : 0
  const moisturePercentage = item.grain_moisture_current ? Math.min(item.grain_moisture_current * 10, 100) : 0
  const ppgLoss = item.ppg_initial && item.ppg_current
    ? ((item.ppg_initial - item.ppg_current) / item.ppg_initial) * 100
    : 0

  const handleStorageChange = async () => {
    if (newStorageCondition === item.storage_condition) {
      setIsEditingStorage(false)
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateStorageCondition(item.id, newStorageCondition)
      if (result.success && result.data) {
        onUpdate?.(result.data)
      }
    } catch (error) {
      console.error('Failed to update storage condition:', error)
    } finally {
      setIsUpdating(false)
      setIsEditingStorage(false)
    }
  }

  const statusColors = {
    fresh: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-700',
    degraded: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-700',
    critical: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700',
  }

  const statusBadgeColors = {
    fresh: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    degraded: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
    critical: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100',
  }

  const statusIcons = {
    fresh: '✓',
    degraded: '⚠',
    critical: '✕',
  }

  return (
    <Card className={cn('border', statusColors[healthStatus])}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <Badge className={statusBadgeColors[healthStatus]}>
              {statusIcons[healthStatus]} {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Received: {new Date(item.received_date).toLocaleDateString()}
          </div>
        </div>
        <CardDescription>Ingredient freshness & quality tracking</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-2 p-2 rounded text-sm',
                  alert.level === 'critical'
                    ? 'bg-red-100 text-red-900'
                    : 'bg-yellow-100 text-yellow-900'
                )}
              >
                {alert.level === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* HSI Metric (Hops) */}
          {item.hsi_initial && item.hsi_initial > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Leaf className="w-4 h-4" />
                  Hop HSI
                </label>
                <span className="text-sm font-bold text-green-700">
                  {item.hsi_current ? item.hsi_current.toFixed(1) : '—'}%
                </span>
              </div>
              <Progress value={hsiPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {item.hsi_initial.toFixed(0)}% → {item.hsi_current?.toFixed(1) || '—'}%
              </p>
            </div>
          )}

          {/* Grain Moisture Metric */}
          {item.grain_moisture_initial !== null && item.grain_moisture_initial !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Droplet className="w-4 h-4" />
                  Grain Moisture
                </label>
                <span
                  className={cn(
                    'text-sm font-bold',
                    item.grain_moisture_current && item.grain_moisture_current > 13
                      ? 'text-red-700'
                      : item.grain_moisture_current && item.grain_moisture_current < 7
                      ? 'text-orange-700'
                      : 'text-green-700'
                  )}
                >
                  {item.grain_moisture_current ? item.grain_moisture_current.toFixed(1) : '—'}%
                </span>
              </div>
              <Progress value={moisturePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Target: 8-12% | Current: {item.grain_moisture_current?.toFixed(1) || '—'}%
              </p>
            </div>
          )}

          {/* PPG Metric (Grain Yield) */}
          {item.ppg_initial && item.ppg_initial > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  PPG Loss
                </label>
                <span className={cn('text-sm font-bold', ppgLoss > 10 ? 'text-red-700' : 'text-green-700')}>
                  -{ppgLoss.toFixed(1)}%
                </span>
              </div>
              <Progress value={ppgLoss} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {item.ppg_initial.toFixed(0)} → {item.ppg_current?.toFixed(0) || '—'} PPG
              </p>
            </div>
          )}
        </div>

        {/* Storage Condition Selector */}
        <div className="pt-2 border-t">
          <label className="text-sm font-medium block mb-2">Storage Condition</label>
          {isEditingStorage ? (
            <div className="flex gap-2">
              <Select value={newStorageCondition} onValueChange={(val) => val && setNewStorageCondition(val as StorageCondition)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cool_dry">Cool & Dry (Ideal)</SelectItem>
                  <SelectItem value="cool_humid">Cool & Humid (Good)</SelectItem>
                  <SelectItem value="room_temp">Room Temperature (Fair)</SelectItem>
                  <SelectItem value="warm">Warm (Poor)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="default"
                aria-label="Confirm storage condition"
                onClick={handleStorageChange}
                disabled={isUpdating}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Cancel storage condition edit"
                onClick={() => {
                  setIsEditingStorage(false)
                  setNewStorageCondition(item.storage_condition || 'cool_dry')
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {item.storage_condition === 'cool_dry' && '🧊 Cool & Dry (Ideal)'}
                {item.storage_condition === 'cool_humid' && '💨 Cool & Humid (Good)'}
                {item.storage_condition === 'room_temp' && '🌡️ Room Temperature (Fair)'}
                {item.storage_condition === 'warm' && '🔥 Warm (Poor)'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Edit storage condition"
                onClick={() => setIsEditingStorage(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Last calculated: {new Date(item.last_degradation_calc).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
