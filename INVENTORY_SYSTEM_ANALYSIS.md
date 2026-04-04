# BrewBrain Inventory System Analysis

## Executive Summary

BrewBrain has a sophisticated inventory management system with **three layers**: inventory tracking, historical audit trails, and anomaly detection (shrinkage alerts). The system is designed to detect unusual inventory losses and help breweries prevent waste, theft, and equipment malfunctions.

---

## 1. DATABASE SCHEMA

### 1.1 Core Tables

#### **`inventory`** (Main inventory items)
- **Tracks**: Hops, Grain, Yeast, Adjunct, Packaging materials
- **Key fields**:
  - `id`, `brewery_id`, `name`, `item_type`
  - `current_stock` (DECIMAL) — live quantity
  - `unit` (TEXT) — kg, lbs, oz, etc.
  - `reorder_point` (DECIMAL) — threshold for low stock alerts
  - `lot_number`, `expiration_date`, `manufacturer`
  - **Degradation tracking** (see below)

**Degradation Columns** (ingredient freshness):
  - `degradation_tracked` (BOOLEAN) — opt-in tracking
  - `received_date` (DATE) — when ingredient arrived
  - `storage_condition` (TEXT) — 'cool_dry', 'cool_humid', 'room_temp', 'warm'
  - `hsi_current` (DECIMAL) — Hop Storage Index (0-100%, degrades ~0.15%/month)
  - `grain_moisture_current` (DECIMAL) — grain moisture %
  - `ppg_current` (DECIMAL) — Points Per Pound Per Gallon (grain potency)
  - `last_degradation_calc` (DATE) — last recalculation timestamp

#### **`inventory_history`** (Complete audit trail)
Records EVERY stock change with full context:
- `id`, `inventory_id`, `brewery_id`
- `previous_stock`, `current_stock`, `quantity_change`
- `change_type` (ENUM) — one of:
  - `stock_adjustment` — manual count reconciliation
  - `recipe_usage` — used in batch/brew
  - `received` — new purchase/delivery
  - `waste` — intentional disposal
  - `other` — uncategorized
- `reason` (TEXT) — optional description
- `batch_id` (UUID FK) — links recipe usage to batches
- `recorded_by` (UUID FK) — user who made change
- `created_at` (TIMESTAMP) — when change occurred

#### **`shrinkage_alerts`** (Anomaly detection results)
Generated automatically when unusual losses detected:
- `id`, `inventory_id`, `brewery_id`
- `severity` (ENUM) — 'low' (0-5%), 'medium' (5-15%), 'high' (15-30%), 'critical' (30%+)
- `alert_type` (ENUM) — one of 5 detection types (see below)
- `expected_stock` (DECIMAL) — based on history
- `actual_stock` (DECIMAL) — measured
- `loss_amount` (DECIMAL) — absolute loss quantity
- `loss_percentage` (DECIMAL) — loss as % of expected
- `z_score` (DECIMAL) — statistical anomaly score (|Z| > 2.5 = anomaly)
- `confidence_score` (DECIMAL) — 0-100, detection confidence
- `average_monthly_loss` (DECIMAL) — baseline loss rate
- `status` (ENUM) — 'unresolved', 'acknowledged', 'investigating', 'resolved', 'false_positive'
- `assigned_to` (UUID FK) — optional user assignment
- `notes` (TEXT) — user investigation notes
- `detected_at` (TIMESTAMP)

#### **`degradation_logs`** (Ingredient freshness audit trail)
Historical record of degradation metric changes:
- `id`, `inventory_id`, `brewery_id`
- `hsi_before`, `hsi_after`
- `grain_moisture_before`, `grain_moisture_after`
- `ppg_before`, `ppg_after`
- `change_reason` (ENUM) — 'auto_calc', 'manual_input', 'storage_change', 'quality_test'
- `storage_condition_at_time` (TEXT)
- `days_elapsed` (INTEGER)
- `logged_by` (UUID FK) — user who recorded change
- `created_at` (TIMESTAMP)

#### **`shrinkage_baselines`** (Statistical reference for detection)
Per-item baseline used for anomaly detection:
- `id`, `inventory_id`, `brewery_id`
- `analysis_period_days` (INTEGER) — typically 90
- `average_monthly_loss` (DECIMAL)
- `monthly_loss_std_dev` (DECIMAL)
- `median_loss_percentage` (DECIMAL)
- `sample_count` (INTEGER) — how many data points
- `loss_threshold_warning` (DECIMAL) — % at which to warn
- `loss_threshold_critical` (DECIMAL) — % at which to alert critical
- `variance_multiplier` (DECIMAL) — 2.5 standard for 99.4% confidence
- `last_calculated_at` (TIMESTAMP)

#### **`push_subscriptions`** (Web push notification setup)
Stores user device push subscriptions for alerts:
- `id`, `user_id`
- `endpoint` (TEXT) — push service endpoint
- `p256dh` (TEXT) — encryption key
- `auth` (TEXT) — authentication key

---

## 2. EXISTING REORDER & ALERT SYSTEMS

### 2.1 Low Stock / Reorder Point
The system has a basic reorder point mechanism:
- **Field**: `inventory.reorder_point` (DECIMAL)
- **Display**: [InventoryTable.tsx](src/components/InventoryTable.tsx) shows items below reorder point
- **Action**: `sendInventoryAlert()` can be called to dispatch push notifications

**Status**: ⚠️ **Not fully integrated** — reorder point is stored but no automatic triggers yet

### 2.2 Shrinkage Anomaly Detection (✅ Fully Implemented)
The **primary alert system** for unusual inventory losses:

**5 Detection Algorithms**:
1. **Unusual Single Loss** — Large loss that deviates from baseline (Z-score > 2.0)
2. **Pattern Degradation** — Consistent gradual losses (low variance, high consistency)
3. **Sudden Spike** — Abrupt drop >2× expected baseline
4. **High Variance** — Inconsistent stock levels suggesting tracking errors
5. **Variance Threshold Exceeded** — Normal variance exceeding threshold

**Severity Matrix**:
| Loss % | Severity | Confidence |
|--------|----------|-----------|
| 0-5%   | Low      | 50-60%    |
| 5-15%  | Medium   | 60-75%    |
| 15-30% | High     | 75-90%    |
| 30%+   | Critical | 90-100%   |

### 2.3 Degradation Tracking (✅ Fully Implemented)
Tracks ingredient freshness with calculated degradation:

**Hop Storage Index (HSI)**:
- Initial HSI set at 100% (fresh)
- Degrades ~0.15% per month in cool/dry conditions
- Faster in warm/humid conditions
- Formula: `hsi_current = hsi_initial × e^(-degradation_rate × months_elapsed)`

**Grain Moisture Content**:
- Target: 7-13% moisture for optimal storage
- Too high (>13%): Mold risk, quality loss
- Too low (<7%): Becomes brittle, kernel damage

**PPG (Potency)**:
- Initial PPG (e.g., 37 for 2-row malt)
- Degrades with time and poor storage
- Tracked alongside moisture

---

## 3. INVENTORY CHANGE TRACKING

### 3.1 How Changes Are Recorded

**Primary Action**: `recordInventoryChange()` in [src/app/actions/shrinkage.ts](src/app/actions/shrinkage.ts)

```typescript
recordInventoryChange(
  inventory_id: string,
  previous_stock: number,
  current_stock: number,
  change_type: 'stock_adjustment' | 'recipe_usage' | 'received' | 'waste' | 'other',
  reason?: string,
  batch_id?: string
): Promise<ActionResult<InventoryHistory>>
```

**Flow**:
1. Insert row into `inventory_history` with all change details
2. Get user ID from auth context
3. Trigger `recalculateShrinkageBaseline()` — updates statistical baseline from last 90 days
4. Trigger `detectAndCreateShrinkageAlert()` — runs all 5 anomaly algorithms
5. Create `shrinkage_alerts` record if anomaly detected
6. Revalidate `/inventory` path (Next.js cache)

### 3.2 Components That Trigger Changes

| Component | Action | Change Type |
|-----------|--------|-------------|
| [InventoryAdjustmentDialog.tsx](src/components/InventoryAdjustmentDialog.tsx) | Manual stock adjustment | `stock_adjustment` \| `recipe_usage` \| `received` \| `waste` |
| [BluetoothScalePanel.tsx](src/components/BluetoothScalePanel.tsx) | Bluetooth scale weight reading | `stock_adjustment` |
| Batch creation (future) | Recipe ingredient usage | `recipe_usage` |

---

## 4. ALERT & NOTIFICATION PATTERNS

### 4.1 Toast Notifications (Client-side)
**Library**: `sonner` (npm package)

**Usage**:
```typescript
import { toast } from 'sonner'

toast.success('Stock updated')
toast.error('Failed to update inventory')
toast.loading('Processing...', { id: 'toastId' })
```

**Where Used**:
- [InventoryAdjustmentDialog.tsx](src/components/InventoryAdjustmentDialog.tsx) — feedback on stock changes
- [ShrinkageAlertCard.tsx](src/components/ShrinkageAlertCard.tsx) — feedback on alert status updates
- [ShrinkageDashboard.tsx](src/components/ShrinkageDashboard.tsx) — refresh confirmation

### 4.2 Push Notifications (Server-side)
**Library**: `web-push` (npm package) + Web Push API

**Managed by**: [src/app/actions/push-actions.ts](src/app/actions/push-actions.ts)

**Functions**:
1. `saveSubscription()` — Save device push subscription to DB
2. `sendTestNotification()` — Send test alert to all user devices
3. `sendInventoryAlert()` — Send low-stock alert

**Example Alert Payload**:
```json
{
  "title": "Low Stock Alert 🔴",
  "body": "Fuggle Hops has dropped below the reorder point. Current stock: 2.5 kg.",
  "url": "/inventory"
}
```

**Delivery**:
- Queries `push_subscriptions` for user's registered devices
- Sends via Web Push API to each endpoint
- Handles failures gracefully (expired subscriptions cleaned up)

### 4.3 Push Notification Manager
**Component**: [PushNotificationManager.tsx](src/components/PushNotificationManager.tsx)

**Features**:
- Registers service worker
- Subscribes to push notifications
- Enables/disables per device
- Syncs subscription to backend

**Requirements**:
- VAPID public/private keys configured
- Service worker registered
- User grants permission

### 4.4 Shrinkage Alert Components

#### [ShrinkageAlertCard.tsx](src/components/ShrinkageAlertCard.tsx)
Displays individual shrinkage alerts:
- **Color-coded severity** (red=critical, orange=high, yellow=medium, blue=low)
- **Alert type description** (5 different detection methods)
- **Statistical metrics** (Z-score, loss %, confidence)
- **Status buttons** — Acknowledge, Investigating, Resolved, False Positive
- **Expandable details** — full analysis view

#### [ShrinkageDashboard.tsx](src/components/ShrinkageDashboard.tsx)
Summary dashboard widget:
- **Stats cards**:
  - Total unresolved alerts
  - Critical alert count
  - This month's total loss
  - Average monthly baseline loss
- **Recent alerts list** (top 5)
- **Auto-refresh capability**

---

## 5. COMPONENT & ACTION INVENTORY

### UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| InventoryTable | List all inventory items with stock levels | src/components/InventoryTable.tsx |
| InventoryAdjustmentDialog | Dialog to record stock changes | src/components/InventoryAdjustmentDialog.tsx |
| AddInventoryItemDialog | Add new inventory item | src/components/AddInventoryItemDialog.tsx |
| ShrinkageAlertCard | Display single alert with actions | src/components/ShrinkageAlertCard.tsx |
| ShrinkageDashboard | Summary statistics & recent alerts | src/components/ShrinkageDashboard.tsx |
| DegradationCard | Display ingredient freshness status | src/components/DegradationCard.tsx |
| DegradationDetailsModal | Detailed freshness analysis & history | src/components/DegradationDetailsModal.tsx |
| PushNotificationManager | Enable/disable push notifications | src/components/PushNotificationManager.tsx |
| BluetoothScalePanel | Bluetooth scale weight input | src/components/BluetoothScalePanel.tsx |

### Server Actions

| Action | Purpose | Location |
|--------|---------|----------|
| recordInventoryChange() | Record stock change & trigger detection | src/app/actions/shrinkage.ts |
| recalculateShrinkageBaseline() | Update statistical baseline from 90-day history | src/app/actions/shrinkage.ts |
| detectAndCreateShrinkageAlert() | Run anomaly detection & create alerts | src/app/actions/shrinkage.ts |
| getShrinkageAlerts() | Fetch alerts with filtering | src/app/actions/shrinkage.ts |
| updateShrinkageAlertStatus() | Mark alert as resolved/false positive/etc | src/app/actions/shrinkage.ts |
| getShrinkageStats() | Get summary statistics for dashboard | src/app/actions/shrinkage.ts |
| saveSubscription() | Save push notification subscription | src/app/actions/push-actions.ts |
| sendTestNotification() | Send test push alert | src/app/actions/push-actions.ts |
| sendInventoryAlert() | Send low-stock push notification | src/app/actions/push-actions.ts |

### Detection Algorithm Library

| Function | Purpose | File |
|----------|---------|------|
| detectShrinkageAnomaly() | Main detection engine | src/lib/shrinkage.ts |
| calculateShrinkageBaseline() | Statistical baseline calculation | src/lib/shrinkage.ts |
| calculateZScore() | Z-score statistical calculation | src/lib/shrinkage.ts |
| calculateStats() | Mean, std dev, median | src/lib/shrinkage.ts |
| detectUnusualSingleLoss() | Algorithm 1 | src/lib/shrinkage.ts |
| detectPatternDegradation() | Algorithm 2 | src/lib/shrinkage.ts |
| detectSuddenSpike() | Algorithm 3 | src/lib/shrinkage.ts |
| detectHighVariance() | Algorithm 4 | src/lib/shrinkage.ts |

---

## 6. DATA FLOW DIAGRAMS

### 6.1 Stock Adjustment Flow
```
User adjusts inventory in InventoryAdjustmentDialog
           ↓
recordInventoryChange() called
           ↓
Insert into inventory_history table
           ↓
recalculateShrinkageBaseline()
   ├─ Load last 90 days of history
   ├─ Calculate mean, std dev, median loss
   └─ Update/create shrinkage_baselines record
           ↓
detectAndCreateShrinkageAlert()
   ├─ Load baseline for item
   ├─ Run 5 anomaly detection algorithms
   ├─ Determine severity (low/medium/high/critical)
   └─ Insert into shrinkage_alerts if anomaly detected
           ↓
Revalidate /inventory cache
           ↓
Toast success message to user
```

### 6.2 Alert Display Flow
```
User views /shrinkage page
           ↓
getShrinkageAlerts('unresolved') called
           ↓
Query shrinkage_alerts table filtered by status
           ↓
Render ShrinkageAlertCard components for each
   ├─ Color by severity
   ├─ Show detection type explanation
   ├─ Show metrics (Z-score, loss %, confidence)
   └─ Provide action buttons
           ↓
User clicks "Investigating"
           ↓
updateShrinkageAlertStatus() called
           ↓
Update alert status in DB + toast feedback
           ↓
Dashboard refreshes with updated status
```

### 6.3 Degradation Tracking Flow
```
User enables degradation_tracked on inventory item
           ↓
getDegradationHistory() loads all degradation_logs
           ↓
recalculate/updateDegradationMetrics() runs periodically (manual/daily)
   ├─ Calculate HSI loss: hsi_initial × e^(-rate × months)
   ├─ Adjust for storage_condition (warm = faster decay)
   └─ Insert into degradation_logs + update inventory record
           ↓
DegradationCard displays current status
   ├─ Fresh (HSI > 75%)
   ├─ Degraded (50-75%)
   └─ Critical (< 50%)
           ↓
generateDegradationAlert() creates warnings if threshold exceeded
```

---

## 7. KEY FINDINGS: WHAT'S IMPLEMENTED ✅

### Fully Implemented
- ✅ **Complete audit trail** — every inventory change logged with user, reason, timestamp
- ✅ **5 anomaly detection algorithms** — sophisticated statistical analysis
- ✅ **4-severity alert system** — low/medium/high/critical with confidence scores
- ✅ **Degradation tracking** — HSI, grain moisture, PPG with historical logs
- ✅ **Web push notifications** — device subscription system ready
- ✅ **Alert management UI** — status tracking (unresolved/acknowledged/investigating/resolved/false_positive)
- ✅ **Dashboard visualization** — summary stats, recent alerts, filters, CSV export
- ✅ **Server-side detection** — automatic on every inventory change
- ✅ **Type safety** — comprehensive TypeScript interfaces for all entities

### Partially Implemented ⚠️
- ⚠️ **Reorder point alerts** — stored in DB but no automatic triggers to `sendInventoryAlert()`
- ⚠️ **Push notifications** — infrastructure ready but not auto-triggered on shrinkage alerts

### Not Implemented ❌
- ❌ **Automated email alerts** — only push/toast available
- ❌ **Batch recipe integration** — `recipe_usage` type exists but not connected to batch creation UI
- ❌ **Scheduled degradation recalculation** — must be triggered manually (no cron job)
- ❌ **Supplier integration** — no automated reorder placement
- ❌ **Trend analysis** — no month-over-month comparison reports yet

---

## 8. ALERT/NOTIFICATION IMPLEMENTATION PATTERNS

### Pattern 1: Real-time Toast Feedback
```typescript
import { toast } from 'sonner'

// On success
toast.success('Updated: Cascade Hops +5 kg')

// On error
toast.error('Failed: Check your input')

// Loading state
const toastId = toast.loading('Processing...')
// ... later ...
toast.success('Done!', { id: toastId })
```

### Pattern 2: Server Action with Result Object
```typescript
export async function recordInventoryChange(...): Promise<ActionResult<InventoryHistory>> {
  try {
    // ... business logic ...
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// Usage in component
const result = await recordInventoryChange(...)
if (result.success) {
  toast.success('Stock updated')
  onSuccess?.()
} else {
  toast.error(result.error)
}
```

### Pattern 3: Automatic Detection & Alert Creation
```typescript
// User records a change
await recordInventoryChange(id, oldStock, newStock, ...)

// Server automatically:
await recalculateShrinkageBaseline(id)
await detectAndCreateShrinkageAlert(id)

// Alert appears on dashboard without user action
```

### Pattern 4: Web Push with Subscription Registry
```typescript
// 1. Device subscribes
const sub = await registration.pushManager.subscribe({ ... })
await saveSubscription(sub)

// 2. Server looks up subscriptions
const subs = await supabase.from('push_subscriptions').select('*').eq('user_id', user.id)

// 3. Send to all devices
await Promise.allSettled(subs.map(sub => webpush.sendNotification(...)))
```

---

## 9. RECOMMENDED NEXT STEPS

### Phase 1: Connect Reorder Points (Quick Win)
1. Hook `sendInventoryAlert()` to fire when `current_stock ≤ reorder_point`
2. Call it from `recordInventoryChange()` after stock update
3. Add toast: "Reorder point reached for {item}"

### Phase 2: Auto Push Shrinkage Alerts (Medium Effort)
1. When `shrinkage_alerts.severity >= 'high'`, call `sendInventoryAlert()`
2. Customize message with alert_type explanation
3. Add URL to `/shrinkage#alert-{alertId}` for direct navigation

### Phase 3: Scheduled Degradation Recalc (Medium Effort)
1. Create server handler function `recalcAllDegradationMetrics(breweryId)`
2. Set up cron job (e.g., daily at 3 AM) via Vercel Cron or similar
3. Show "Last recalculated at X" timestamp on UI

### Phase 4: Email Alerts (if needed)
1. Use Resend or SendGrid for email
2. Create templates for: "Shrinkage Alert", "Low Stock", "Degradation Warning"
3. Add email preference to user settings

---

## 10. FILE REFERENCE GUIDE

**Database**:
- Schema: [supabase/schema.sql](supabase/schema.sql) — main tables
- Migrations: [supabase/migrations/add_shrinkage_alerts.sql](supabase/migrations/add_shrinkage_alerts.sql) — shrinkage tables
- Migrations: [supabase/migrations/add_degradation_columns.sql](supabase/migrations/add_degradation_columns.sql) — degradation tables

**Core Logic**:
- Detection algorithms: [src/lib/shrinkage.ts](src/lib/shrinkage.ts)
- Degradation calculations: [src/lib/degradation.ts](src/lib/degradation.ts)
- Types: [src/types/database.ts](src/types/database.ts)

**Server Actions**:
- Shrinkage operations: [src/app/actions/shrinkage.ts](src/app/actions/shrinkage.ts)
- Push notifications: [src/app/actions/push-actions.ts](src/app/actions/push-actions.ts)
- Inventory CRUD: [src/app/(app)/inventory/actions.ts](src/app/(app)/inventory/actions.ts)

**UI Components**:
- Main inventory table: [src/components/InventoryTable.tsx](src/components/InventoryTable.tsx)
- Stock adjustment dialog: [src/components/InventoryAdjustmentDialog.tsx](src/components/InventoryAdjustmentDialog.tsx)
- Shrinkage alerts: [src/components/ShrinkageAlertCard.tsx](src/components/ShrinkageAlertCard.tsx)
- Shrinkage dashboard: [src/components/ShrinkageDashboard.tsx](src/components/ShrinkageDashboard.tsx)
- Degradation display: [src/components/DegradationCard.tsx](src/components/DegradationCard.tsx)
- Push notifications: [src/components/PushNotificationManager.tsx](src/components/PushNotificationManager.tsx)

**Documentation**:
- Comprehensive guide: [SHRINKAGE_ALERTS_GUIDE.md](SHRINKAGE_ALERTS_GUIDE.md)
- Implementation details: [SHRINKAGE_IMPLEMENTATION.md](SHRINKAGE_IMPLEMENTATION.md)
- Degradation metrics: [DEGRADATION_METRICS_PLAN.md](DEGRADATION_METRICS_PLAN.md)

---

## Summary Table

| Aspect | Status | Coverage |
|--------|--------|----------|
| **Inventory Tracking** | ✅ Complete | All item types, units, storage conditions |
| **Historical Audit Trail** | ✅ Complete | Every change logged with context |
| **Reorder Points** | ⚠️ Partial | Data stored, alerts not auto-triggered |
| **Shrinkage Detection** | ✅ Complete | 5 algorithms, 4 severity levels, confidence scoring |
| **Degradation Tracking** | ✅ Complete | HSI, moisture, PPG with exponential decay model |
| **Toast Notifications** | ✅ Complete | Real-time feedback via Sonner |
| **Push Notifications** | ⚠️ Partial | Infrastructure ready, not auto-triggered yet |
| **Dashboard UI** | ✅ Complete | Stats, filters, recent alerts, CSV export |
| **Alert Management** | ✅ Complete | 5 status states, user assignment, notes |
| **Type Safety** | ✅ Complete | Full TypeScript interfaces |

