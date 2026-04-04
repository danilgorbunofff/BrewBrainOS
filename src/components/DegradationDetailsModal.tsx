'use client'

import { useState, useEffect } from 'react'
import { InventoryItem, DegradationLog } from '@/types/database'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDegradationHistory, updateDegradationMetrics } from '@/app/(app)/inventory/actions'
import { TrendingDown, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DegradationDetailsModalProps {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (updatedItem: InventoryItem) => void
}

export function DegradationDetailsModal({
  item,
  open,
  onOpenChange,
  onUpdate,
}: DegradationDetailsModalProps) {
  const [logs, setLogs] = useState<DegradationLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [editValues, setEditValues] = useState({
    hsi: item.hsi_current || '',
    moisture: item.grain_moisture_current || '',
    ppg: item.ppg_current || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open])

  async function loadHistory() {
    setIsLoadingLogs(true)
    try {
      const result = await getDegradationHistory(item.id)
      if (result.success && result.data) {
        setLogs(result.data)
      }
    } catch (error) {
      console.error('Failed to load degradation history:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  async function handleSaveMetrics() {
    setIsSaving(true)
    try {
      const updates: Partial<{
        hsi_current: number
        grain_moisture_current: number
        ppg_current: number
      }> = {}

      if (editValues.hsi) updates.hsi_current = Number(editValues.hsi)
      if (editValues.moisture) updates.grain_moisture_current = Number(editValues.moisture)
      if (editValues.ppg) updates.ppg_current = Number(editValues.ppg)

      if (Object.keys(updates).length === 0) {
        setIsEditingMetrics(false)
        return
      }

      const result = await updateDegradationMetrics(item.id, updates, 'manual_input')
      if (result.success && result.data) {
        onUpdate?.(result.data)
        setEditValues({
          hsi: result.data.hsi_current || '',
          moisture: result.data.grain_moisture_current || '',
          ppg: result.data.ppg_current || '',
        })
        setIsEditingMetrics(false)
        await loadHistory()
      }
    } catch (error) {
      console.error('Failed to update metrics:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const daysSinceReceived = Math.floor(
    (Date.now() - new Date(item.received_date).getTime()) / (1000 * 60 * 60 * 24)
  )

  const degradationRate =
    item.hsi_initial && item.hsi_current
      ? ((item.hsi_initial - item.hsi_current) / item.hsi_initial / (daysSinceReceived || 1)) * 100
      : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-background/95 dark:bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">{item.name} - Quality Details</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Track ingredient degradation metrics over time
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metrics">Current Metrics</TabsTrigger>
            <TabsTrigger value="history">Audit History</TabsTrigger>
          </TabsList>

          {/* Current Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days Since Received</p>
                <p className="text-2xl font-black">{daysSinceReceived}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Condition</p>
                <p className="text-lg font-bold">
                  {item.storage_condition === 'cool_dry' && '🧊 Cool & Dry'}
                  {item.storage_condition === 'cool_humid' && '💨 Cool & Humid'}
                  {item.storage_condition === 'room_temp' && '🌡️ Room Temp'}
                  {item.storage_condition === 'warm' && '🔥 Warm'}
                </p>
              </div>
            </div>

            {/* Metrics Display/Edit */}
            {isEditingMetrics ? (
              <div className="space-y-4">
                {item.hsi_initial && item.hsi_initial > 0 && (
                  <div className="space-y-2">
                    <Label className="font-bold">Hop HSI (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editValues.hsi}
                      onChange={(e) => setEditValues({ ...editValues, hsi: e.target.value })}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Initial: {item.hsi_initial.toFixed(1)}% | Degradation rate: {degradationRate.toFixed(2)}%/day
                    </p>
                  </div>
                )}

                {item.grain_moisture_initial !== null && item.grain_moisture_initial !== undefined && (
                  <div className="space-y-2">
                    <Label className="font-bold">Grain Moisture (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      value={editValues.moisture}
                      onChange={(e) => setEditValues({ ...editValues, moisture: e.target.value })}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Initial: {item.grain_moisture_initial.toFixed(1)}% | Optimal: 8-12%
                    </p>
                  </div>
                )}

                {item.ppg_initial && item.ppg_initial > 0 && (
                  <div className="space-y-2">
                    <Label className="font-bold">PPG (Extract Points)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={editValues.ppg}
                      onChange={(e) => setEditValues({ ...editValues, ppg: e.target.value })}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Initial: {item.ppg_initial.toFixed(0)} | Current: {item.ppg_current?.toFixed(0) || '—'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveMetrics}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingMetrics(false)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {item.hsi_current !== null && item.hsi_current !== undefined && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-700 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Hop HSI</p>
                      <p className="text-2xl font-black text-green-700 dark:text-green-100">{item.hsi_current.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Loss: {((item.hsi_initial! - item.hsi_current) / item.hsi_initial! * 100).toFixed(1)}% over {daysSinceReceived} days
                      </p>
                    </div>
                  )}

                  {item.grain_moisture_current !== null && item.grain_moisture_current !== undefined && (
                    <div className={cn(
                      'p-3 border rounded-lg',
                      item.grain_moisture_current > 13
                        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700'
                        : item.grain_moisture_current < 7
                        ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-700'
                        : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-700'
                    )}>
                      <p className="text-sm font-medium text-muted-foreground">Grain Moisture</p>
                      <p className={cn(
                        'text-2xl font-black',
                        item.grain_moisture_current > 13
                          ? 'text-red-700 dark:text-red-100'
                          : item.grain_moisture_current < 7
                          ? 'text-orange-700 dark:text-orange-100'
                          : 'text-green-700 dark:text-green-100'
                      )}>
                        {item.grain_moisture_current.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Target range: 8-12% | Status: {
                          item.grain_moisture_current > 13
                            ? '⚠️ High risk'
                            : item.grain_moisture_current < 7
                            ? '⚠️ Too dry'
                            : '✓ Optimal'
                        }
                      </p>
                    </div>
                  )}

                  {item.ppg_current !== null && item.ppg_current !== undefined && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">PPG (Yield)</p>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-100">{item.ppg_current.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Initial: {item.ppg_initial} | Loss: {((item.ppg_initial! - item.ppg_current) / item.ppg_initial! * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsEditingMetrics(true)}
                  className="w-full"
                >
                  Manual Override
                </Button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 py-4">
            {isLoadingLogs ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No degradation history yet</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs font-bold whitespace-nowrap">Change</TableHead>
                      <TableHead className="text-xs font-bold whitespace-nowrap">Before</TableHead>
                      <TableHead className="text-xs font-bold whitespace-nowrap">After</TableHead>
                      <TableHead className="text-xs font-bold whitespace-nowrap">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs space-y-1">
                          {log.hsi_before != null && log.hsi_after != null && (
                            <div>
                              HSI: {log.hsi_before.toFixed(1)} → {log.hsi_after.toFixed(1)}
                            </div>
                          )}
                          {log.grain_moisture_before != null && log.grain_moisture_after != null && (
                            <div>
                              Moisture: {log.grain_moisture_before.toFixed(1)} → {log.grain_moisture_after.toFixed(1)}
                            </div>
                          )}
                          {log.ppg_before != null && log.ppg_after != null && (
                            <div>
                              PPG: {log.ppg_before.toFixed(0)} → {log.ppg_after.toFixed(0)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {log.hsi_before != null ? `${log.hsi_before.toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {log.hsi_after != null ? `${log.hsi_after.toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <span className={cn(
                            'px-3 py-1.5 rounded text-white text-xs font-bold uppercase inline-block',
                            log.change_reason === 'auto_calc' && 'bg-blue-600 dark:bg-blue-700',
                            log.change_reason === 'manual_input' && 'bg-purple-600 dark:bg-purple-700',
                            log.change_reason === 'storage_change' && 'bg-orange-600 dark:bg-orange-700',
                            log.change_reason === 'quality_test' && 'bg-green-600 dark:bg-green-700'
                          )}>
                            {log.change_reason}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
