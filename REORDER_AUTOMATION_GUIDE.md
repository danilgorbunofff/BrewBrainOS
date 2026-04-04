# Reorder Automation Implementation Guide

## Overview
This guide provides a complete implementation strategy for the **Reorder Automation** feature, enabling BrewBrain to automatically notify users when inventory stock hits reorder points. This prevents production delays and ensures breweries never run out of critical ingredients.

---

## Architecture & Design

### Core Concept
When inventory quantity falls to or below the `reorder_point` for any item, the system should:
1. Detect the threshold breach
2. Create a reorder alert record
3. Notify the brewery user(s) via toast, web push, and/or email
4. Track alert state (new/acknowledged/resolved)
5. Optionally auto-generate a purchase order draft

### Integration Points
- **Trigger**: Every inventory adjustment (recipe usage, manual adjustment, received stock, waste)
- **Pattern**: Follows existing shrinkage alert system—lightweight, event-driven
- **Storage**: New `reorder_alerts` table (similar to `shrinkage_alerts`)
- **Notifications**: Reuse existing `toast`, `web-push`, and email infrastructure

---

## Database Schema

### 1. Create `reorder_alerts` Table

```sql
-- Track reorder point violations
CREATE TABLE reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  
  -- Alert state
  alert_type VARCHAR(50) NOT NULL, -- 'reorder_point_hit', 'critical_low', 'stockout_imminent'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved'
  
  -- Inventory context
  current_quantity DECIMAL(10, 2) NOT NULL,
  reorder_point DECIMAL(10, 2) NOT NULL,
  units_to_reorder DECIMAL(10, 2), -- Suggested quantity
  last_order_date TIMESTAMP,
  estimated_stockout_days INTEGER, -- Based on usage rate
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_open_alert 
    UNIQUE (brewery_id, inventory_item_id, alert_type, status)
    WHERE status = 'open'
);

CREATE INDEX idx_reorder_alerts_brewery 
  ON reorder_alerts(brewery_id, created_at DESC);
CREATE INDEX idx_reorder_alerts_status 
  ON reorder_alerts(brewery_id, status, severity);
```

### 2. Add `reorder_point_history` Table (Optional but Recommended)

```sql
-- Track when reorder points are configured
CREATE TABLE reorder_point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  old_reorder_point DECIMAL(10, 2),
  new_reorder_point DECIMAL(10, 2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX idx_reorder_point_history 
  ON reorder_point_history(inventory_item_id, changed_at DESC);
```

### 3. Enhance `inventory` Table (if needed)

```sql
-- Add fields to track reorder behavior
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7, -- Expected delivery time
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS avg_weekly_usage DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS last_stock_alert_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS suppress_reorder_alerts BOOLEAN DEFAULT FALSE;
```

---

## Server-Side Implementation

### 1. Create Alert Detection Function

**File**: `src/lib/reorder.ts`

```typescript
import { createClient } from '@/utils/supabase/server'
import { MutableRefObject } from 'react'

export type ReorderAlertType = 'reorder_point_hit' | 'critical_low' | 'stockout_imminent'
export type AlertSeverity = 'info' | 'warning' | 'critical'

interface ReorderAlertInput {
  breweryId: string
  inventoryItemId: string
  currentQuantity: number
  reorderPoint: number
  itemName: string
  unitType: string
  lastOrderDate?: string
  avgWeeklyUsage?: number
}

interface ReorderAlertResult {
  alertCreated: boolean
  alertId?: string
  alertType: ReorderAlertType
  severity: AlertSeverity
  daysUntilStockout?: number
  message: string
}

/**
 * Determines alert type and severity based on quantities and usage
 */
function classifyReorderAlert(
  current: number,
  reorder: number,
  avgWeeklyUsage?: number
): { type: ReorderAlertType; severity: AlertSeverity; daysUntilStockout?: number } {
  const percentageOfReorder = (current / reorder) * 100

  if (current <= 0) {
    return {
      type: 'stockout_imminent',
      severity: 'critical',
      daysUntilStockout: 0,
    }
  }

  if (avgWeeklyUsage && avgWeeklyUsage > 0) {
    const daysRemaining = (current / avgWeeklyUsage) * 7
    if (daysRemaining <= 3) {
      return {
        type: 'stockout_imminent',
        severity: 'critical',
        daysUntilStockout: Math.ceil(daysRemaining),
      }
    }
    if (daysRemaining <= 7) {
      return {
        type: 'critical_low',
        severity: 'warning',
        daysUntilStockout: Math.ceil(daysRemaining),
      }
    }
  }

  if (percentageOfReorder <= 50) {
    return {
      type: 'critical_low',
      severity: 'warning',
    }
  }

  return {
    type: 'reorder_point_hit',
    severity: 'info',
  }
}

/**
 * Check if reorder point has been breached and create alert if needed
 */
export async function checkAndCreateReorderAlert(
  input: ReorderAlertInput
): Promise<ReorderAlertResult> {
  const supabase = await createClient()

  // Check if alert already exists
  const { data: existingAlert } = await supabase
    .from('reorder_alerts')
    .select('id')
    .eq('brewery_id', input.breweryId)
    .eq('inventory_item_id', input.inventoryItemId)
    .eq('status', 'open')
    .single()

  // If item isn't suppressed and quantity is at or below reorder point
  const { data: inventoryItem } = await supabase
    .from('inventory')
    .select('suppress_reorder_alerts, avg_weekly_usage')
    .eq('id', input.inventoryItemId)
    .single()

  if (inventoryItem?.suppress_reorder_alerts) {
    return {
      alertCreated: false,
      alertType: 'reorder_point_hit',
      severity: 'info',
      message: 'Alerts suppressed for this item',
    }
  }

  const { type, severity, daysUntilStockout } = classifyReorderAlert(
    input.currentQuantity,
    input.reorderPoint,
    input.avgWeeklyUsage || inventoryItem?.avg_weekly_usage
  )

  // Only proceed if there's an actual breach
  if (input.currentQuantity > input.reorderPoint && !existingAlert) {
    return {
      alertCreated: false,
      alertType: type,
      severity: severity,
      message: `Stock level is healthy (${input.currentQuantity} > ${input.reorderPoint})`,
    }
  }

  // Don't create duplicate alerts
  if (existingAlert) {
    return {
      alertCreated: false,
      alertId: existingAlert.id,
      alertType: type,
      severity: severity,
      daysUntilStockout,
      message: 'Alert already exists for this item',
    }
  }

  // Create the alert
  const { data: newAlert, error } = await supabase
    .from('reorder_alerts')
    .insert([
      {
        brewery_id: input.breweryId,
        inventory_item_id: input.inventoryItemId,
        alert_type: type,
        severity,
        status: 'open',
        current_quantity: input.currentQuantity,
        reorder_point: input.reorderPoint,
        units_to_reorder: Math.max(
          input.reorderPoint * 2, // Suggest ordering 2x reorder point
          input.reorderPoint
        ),
        estimated_stockout_days: daysUntilStockout,
        last_order_date: input.lastOrderDate,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      },
    ])
    .select('id')
    .single()

  if (error) {
    return {
      alertCreated: false,
      alertType: type,
      severity,
      daysUntilStockout,
      message: `Failed to create alert: ${error.message}`,
    }
  }

  return {
    alertCreated: true,
    alertId: newAlert?.id,
    alertType: type,
    severity,
    daysUntilStockout,
    message: `Reorder alert created: ${input.itemName} is ${severity}`,
  }
}

/**
 * Acknowledge an existing alert (user has seen it)
 */
export async function acknowledgeReorderAlert(alertId: string): Promise<void> {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  await supabase
    .from('reorder_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.user?.id,
    })
    .eq('id', alertId)
}

/**
 * Resolve an alert (item has been reordered)
 */
export async function resolveReorderAlert(
  alertId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  await supabase
    .from('reorder_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.user?.id,
      resolution_notes: notes,
    })
    .eq('id', alertId)
}

/**
 * Get active reorder alerts for a brewery
 */
export async function getReorderAlerts(breweryId: string, filter?: 'open' | 'acknowledged') {
  const supabase = await createClient()
  let query = supabase
    .from('reorder_alerts')
    .select(
      `
      id,
      alert_type,
      severity,
      status,
      current_quantity,
      reorder_point,
      units_to_reorder,
      estimated_stockout_days,
      created_at,
      inventory_item:inventory!inner(id, name, unit_type, supplier_id)
    `
    )
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false })

  if (filter) {
    query = query.eq('status', filter)
  } else {
    query = query.in('status', ['open', 'acknowledged'])
  }

  return await query
}
```

### 2. Integrate into Inventory Actions

**File**: `src/app/(app)/brewery-actions.ts` (add to existing file)

```typescript
import { checkAndCreateReorderAlert } from '@/lib/reorder'

/**
 * Existing adjustInventory action - modify to include reorder check
 */
export async function adjustInventory(
  breweryId: string,
  itemId: string,
  quantity: number,
  type: 'adjustment' | 'recipe' | 'received' | 'waste',
  reason?: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Get current inventory item
    const { data: item, error: itemError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .eq('brewery_id', breweryId)
      .single()

    if (itemError || !item) {
      return { success: false, error: 'Item not found' }
    }

    const newQuantity = item.quantity + quantity

    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('id', itemId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log to history
    await supabase.from('inventory_history').insert([
      {
        inventory_item_id: itemId,
        brewery_id: breweryId,
        type,
        quantity_change: quantity,
        new_quantity: newQuantity,
        reason,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      },
    ])

    // CHECK REORDER POINT
    if (newQuantity <= item.reorder_point && item.reorder_point > 0) {
      const alertResult = await checkAndCreateReorderAlert({
        breweryId,
        inventoryItemId: itemId,
        currentQuantity: newQuantity,
        reorderPoint: item.reorder_point,
        itemName: item.name,
        unitType: item.unit_type,
        avgWeeklyUsage: item.avg_weekly_usage,
      })

      // Send notification
      if (alertResult.alertCreated) {
        await sendReorderNotification(breweryId, item.name, alertResult)
      }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Send notifications for reorder alert
 */
async function sendReorderNotification(
  breweryId: string,
  itemName: string,
  alertResult: ReorderAlertResult
): Promise<void> {
  const supabase = await createClient()

  // Send web push notification
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, auth, p256dh')
    .eq('brewery_id', breweryId)

  if (subscriptions && subscriptions.length > 0) {
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          JSON.stringify({
            title: `${itemName} Reorder Needed`,
            body: alertResult.message,
            tag: `reorder-${alertResult.alertId}`,
            data: {
              alertId: alertResult.alertId,
              severity: alertResult.severity,
            },
          })
        )
      } catch (error) {
        console.error('Failed to send push notification:', error)
      }
    }
  }
}
```

---

## Client-Side Implementation

### 1. Create `ReorderAlertCard` Component

**File**: `src/components/ReorderAlertCard.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Zap } from 'lucide-react'
import {
  acknowledgeReorderAlert,
  resolveReorderAlert,
} from '@/lib/reorder'
import { toast } from 'sonner'

interface ReorderAlertCardProps {
  alert: {
    id: string
    alert_type: string
    severity: string
    status: string
    current_quantity: number
    reorder_point: number
    units_to_reorder?: number
    estimated_stockout_days?: number
    inventory_item: {
      name: string
      unit_type: string
    }
  }
  onStatusChange?: () => void
}

const severityConfig = {
  info: { color: 'bg-blue-50', icon: 'ℹ️', border: 'border-blue-200' },
  warning: { color: 'bg-yellow-50', icon: '⚠️', border: 'border-yellow-200' },
  critical: { color: 'bg-red-50', icon: '🚨', border: 'border-red-200' },
}

export default function ReorderAlertCard({ alert, onStatusChange }: ReorderAlertCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const config = severityConfig[alert.severity as keyof typeof severityConfig]
  const daysText =
    alert.estimated_stockout_days === 0
      ? 'OUT OF STOCK'
      : alert.estimated_stockout_days
        ? `${alert.estimated_stockout_days} days remaining`
        : ''

  const handleAcknowledge = async () => {
    setIsLoading(true)
    try {
      await acknowledgeReorderAlert(alert.id)
      toast.success('Alert acknowledged')
      onStatusChange?.()
    } catch (error) {
      toast.error('Failed to acknowledge alert')
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
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`border ${config.border} ${config.color}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{config.icon}</span>
              {alert.inventory_item.name}
            </CardTitle>
            <CardDescription>Stock below reorder point</CardDescription>
          </div>
          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
            {alert.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-lg font-semibold">
              {alert.current_quantity} {alert.inventory_item.unit_type}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Reorder Point</p>
            <p className="text-lg font-semibold">
              {alert.reorder_point} {alert.inventory_item.unit_type}
            </p>
          </div>
        </div>

        {alert.units_to_reorder && (
          <div className="rounded-md bg-white p-2">
            <p className="text-sm text-gray-600">Suggested Order</p>
            <p className="font-semibold">
              {alert.units_to_reorder} {alert.inventory_item.unit_type}
            </p>
          </div>
        )}

        {daysText && (
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
            <AlertCircle className="h-4 w-4" />
            {daysText}
          </div>
        )}

        <div className="flex gap-2">
          {alert.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledge}
              disabled={isLoading}
            >
              Acknowledge
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleResolve}
            disabled={isLoading}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            {alert.status === 'open' ? 'Mark Ordered' : 'Resolved'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2. Create `ReorderAlertsDashboard` Component

**File**: `src/components/ReorderAlertsDashboard.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getReorderAlerts } from '@/lib/reorder'
import ReorderAlertCard from './ReorderAlertCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ReorderAlertsDashboardProps {
  breweryId: string
}

export default function ReorderAlertsDashboard({ breweryId }: ReorderAlertsDashboardProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged'>('open')

  useEffect(() => {
    loadAlerts()
  }, [breweryId, filter])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const data = await getReorderAlerts(
        breweryId,
        filter === 'all' ? undefined : (filter as 'open' | 'acknowledged')
      )
      setAlerts(data || [])
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Alerts</CardTitle>
        <CardDescription>
          {criticalCount} critical, {warningCount} warning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="open">Open ({alerts.filter((a) => a.status === 'open').length})</TabsTrigger>
            <TabsTrigger value="acknowledged">
              Acknowledged ({alerts.filter((a) => a.status === 'acknowledged').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3">
            {loading ? (
              <p className="text-gray-500">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reorder alerts</p>
            ) : (
              alerts.map((alert) => (
                <ReorderAlertCard key={alert.id} alert={alert} onStatusChange={loadAlerts} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

### 3. Add to Main Dashboard

Integrate the `ReorderAlertsDashboard` component into your main dashboard page in the appropriate location.

---

## Notification System Integration

### Email Notifications (Optional Enhancement)

**File**: `src/lib/reorder.ts` (extend previous code)

```typescript
import nodemailer from 'nodemailer'

interface EmailNotificationInput {
  breweryName: string
  itemName: string
  currentQuantity: number
  reorderPoint: number
  daysUntilStockout?: number
  recipientEmail: string
}

export async function sendReorderEmailNotification(
  input: EmailNotificationInput
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFICATION_EMAIL,
      pass: process.env.NOTIFICATION_EMAIL_PASSWORD,
    },
  })

  const subject = `⚠️ ${input.itemName} Needs Reordering - ${input.breweryName}`

  const html = `
    <h2>Reorder Alert for ${input.breweryName}</h2>
    <p><strong>${input.itemName}</strong> is below the reorder point.</p>
    <ul>
      <li>Current Stock: ${input.currentQuantity}</li>
      <li>Reorder Point: ${input.reorderPoint}</li>
      ${input.daysUntilStockout ? `<li>Estimated Days Until Stockout: ${input.daysUntilStockout}</li>` : ''}
    </ul>
    <p><strong>Action Required:</strong> Please place an order to maintain inventory levels.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory">
      View Inventory Dashboard
    </a>
  `

  await transporter.sendMail({
    from: process.env.NOTIFICATION_EMAIL,
    to: recipientEmail,
    subject,
    html,
  })
}
```

---

## Settings & Configuration

### User-Configurable Settings

**File**: `src/components/InventorySettingsDialog.tsx` (new component)

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface InventorySettingsDialogProps {
  itemId: string
  itemName: string
  reorderPoint: number
  minOrderQuantity?: number
  leadTimeDays?: number
  avgWeeklyUsage?: number
  suppressAlerts?: boolean
  onSave: (settings: any) => Promise<void>
}

export default function InventorySettingsDialog(props: InventorySettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    reorderPoint: props.reorderPoint,
    minOrderQuantity: props.minOrderQuantity || 0,
    leadTimeDays: props.leadTimeDays || 7,
    avgWeeklyUsage: props.avgWeeklyUsage || 0,
    suppressAlerts: props.suppressAlerts || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await props.onSave(formData)
      toast.success('Settings saved')
      setOpen(false)
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Settings
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reorder Settings for {props.itemName}</DialogTitle>
          <DialogDescription>Configure reorder alerts and automation</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reorderPoint">Reorder Point</Label>
            <Input
              id="reorderPoint"
              type="number"
              value={formData.reorderPoint}
              onChange={(e) =>
                setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) })
              }
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="minOrderQuantity">Minimum Order Quantity</Label>
            <Input
              id="minOrderQuantity"
              type="number"
              value={formData.minOrderQuantity}
              onChange={(e) =>
                setFormData({ ...formData, minOrderQuantity: parseFloat(e.target.value) })
              }
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
            <Input
              id="leadTimeDays"
              type="number"
              value={formData.leadTimeDays}
              onChange={(e) =>
                setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) })
              }
              placeholder="7"
            />
          </div>

          <div>
            <Label htmlFor="avgWeeklyUsage">Average Weekly Usage</Label>
            <Input
              id="avgWeeklyUsage"
              type="number"
              step="0.01"
              value={formData.avgWeeklyUsage}
              onChange={(e) =>
                setFormData({ ...formData, avgWeeklyUsage: parseFloat(e.target.value) })
              }
              placeholder="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.suppressAlerts}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, suppressAlerts: checked })
              }
            />
            <Label>Suppress reorder alerts</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Testing Strategy

### 1. Unit Tests

**File**: `__tests__/lib/reorder.test.ts`

```typescript
import { classifyReorderAlert } from '@/lib/reorder'

describe('Reorder Automation', () => {
  describe('classifyReorderAlert', () => {
    it('should classify as reorder_point_hit when slightly below', () => {
      const result = classifyReorderAlert(45, 50)
      expect(result.type).toBe('reorder_point_hit')
      expect(result.severity).toBe('info')
    })

    it('should classify as critical_low when significantly below', () => {
      const result = classifyReorderAlert(10, 50)
      expect(result.type).toBe('critical_low')
      expect(result.severity).toBe('warning')
    })

    it('should classify as stockout_imminent with low usage rate', () => {
      const result = classifyReorderAlert(5, 50, 2) // 2 units per week usage
      expect(result.type).toBe('stockout_imminent')
      expect(result.severity).toBe('critical')
      expect(result.daysUntilStockout).toBe(18)
    })

    it('should detect immediate stockout', () => {
      const result = classifyReorderAlert(0, 50)
      expect(result.type).toBe('stockout_imminent')
      expect(result.severity).toBe('critical')
      expect(result.daysUntilStockout).toBe(0)
    })
  })
})
```

### 2. Integration Testing Script

```typescript
// Manual testing checklist
// 1. Create inventory item with reorder_point = 10
// 2. Adjust quantity to 9 → should create alert
// 3. Acknowledge alert → status should change
// 4. Adjust quantity back to 11 → existing alert should not duplicate
// 5. Adjust quantity to 0 → should create 'stockout_imminent' alert
// 6. Check notifications appear in browser and email
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create database tables (`reorder_alerts`, `reorder_point_history`)
- [ ] Implement `reorder.ts` library functions
- [ ] Integrate alert detection in `adjustInventory()` action
- [ ] Create `ReorderAlertCard` component

### Phase 2: User Interface (Week 2)
- [ ] Build `ReorderAlertsDashboard` component
- [ ] Add settings configuration component
- [ ] Integrate into main dashboard
- [ ] Style and UX polish

### Phase 3: Notifications (Week 2-3)
- [ ] Configure web push notifications
- [ ] Implement email notifications (optional)
- [ ] Test notification delivery
- [ ] Add notification preferences UI

### Phase 4: Testing & Refinement (Week 3)
- [ ] Unit testing
- [ ] Integration testing
- [ ] User feedback gathering
- [ ] Performance optimization

---

## Configuration Constants

Add to your `.env.local`:

```env
# Reorder Alerts
NEXT_PUBLIC_REORDER_ALERT_LEAD_TIME_DAYS=7
NEXT_PUBLIC_CRITICAL_LOW_THRESHOLD=50  # % of reorder point
NEXT_PUBLIC_STOCKOUT_WARNING_DAYS=7

# Email Notifications
NOTIFICATION_EMAIL=alerts@brewbrain.app
NOTIFICATION_EMAIL_PASSWORD=your_secure_password
```

---

## Success Metrics

- **Alert Accuracy**: >95% precision in detecting reorder points
- **Notification Delivery**: >99% push notification delivery rate
- **User Adoption**: >80% of active breweries enable reorder alerts
- **Production Delays Prevented**: Track reduction in "out of stock" incidents
- **Response Time**: Average time from alert to reorder < 24 hours

---

## Future Enhancements

1. **Automatic Reorder**: Integrate with suppliers to auto-generate purchase orders
2. **Predictive Reordering**: Use historical usage to predict and preemptively reorder
3. **Supplier Integration**: Connect to supplier APIs for real-time pricing and availability
4. **Multi-Item Orders**: Group related items for efficient ordering
5. **Budget Tracking**: Alert when reorders exceed budget thresholds
6. **Demand Forecasting**: Use seasonality and trends to optimize reorder points

---

## Related Documentation

- Review existing [INVENTORY_SYSTEM_ANALYSIS.md](INVENTORY_SYSTEM_ANALYSIS.md) for current inventory architecture
- Check [SHRINKAGE_IMPLEMENTATION.md](SHRINKAGE_IMPLEMENTATION.md) for pattern examples
- See [MASTER_PLAN.md](MASTER_PLAN.md) for overall feature priorities
