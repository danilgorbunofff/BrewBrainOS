# Degradation Metrics Implementation Plan

## Overview
Implement tracking for ingredient freshness and quality through three key metrics:
- **Hop HSI (Hop Storage Index)**: Rate at which hop potency degrades (0-100%, where 100 = fresh)
- **Grain Moisture Content**: Percentage of water in stored grain (typically 8-12% optimal range)
- **PPG (Points Per Pound Per Gallon)**: Extract efficiency metric indicating grain yield potential

---

## Phase 1: Database Schema

### 1.1 Extend `inventory` Table
Add degradation-tracking columns to track ingredient quality over time:

```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS
  hsi_initial DECIMAL DEFAULT 100,           -- Initial HSI value (0-100)
  hsi_current DECIMAL DEFAULT 100,           -- Current HSI value (degrades over time)
  hsi_loss_rate DECIMAL DEFAULT 0.15,        -- Monthly HSI loss % (hops degrade ~0.15% per month)
  grain_moisture_initial DECIMAL DEFAULT 10, -- Initial moisture content %
  grain_moisture_current DECIMAL DEFAULT 10, -- Current moisture content %
  ppg_initial DECIMAL DEFAULT 37,            -- Initial PPG (typical range: 30-45)
  ppg_current DECIMAL DEFAULT 37,            -- Current PPG after losses
  received_date DATE NOT NULL DEFAULT CURRENT_DATE; -- When ingredient arrived (triggers degradation calc)

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS
  degradation_tracked BOOLEAN DEFAULT FALSE, -- Flag: is this item tracked for degradation?
  storage_condition TEXT DEFAULT 'cool_dry'; -- Storage environment: 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'
  last_degradation_calc DATE DEFAULT CURRENT_DATE; -- Last time degradation was recalculated
```

### 1.2 Create `degradation_logs` Table
Audit trail for all degradation calculations and adjustments:

```sql
CREATE TABLE IF NOT EXISTS degradation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE,
  
  -- Before & After snapshots
  hsi_before DECIMAL,
  hsi_after DECIMAL,
  grain_moisture_before DECIMAL,
  grain_moisture_after DECIMAL,
  ppg_before DECIMAL,
  ppg_after DECIMAL,
  
  -- Change metadata
  change_reason TEXT CHECK (change_reason IN ('auto_calc', 'manual_input', 'storage_change', 'quality_test')),
  storage_condition_at_time TEXT,
  days_elapsed INTEGER,
  
  -- Audit trail
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_degradation_logs_inventory ON degradation_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_degradation_logs_brewery ON degradation_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_degradation_logs_created ON degradation_logs(created_at);
```

---

## Phase 2: TypeScript Types & Validation

### 2.1 Update `database.ts`
```typescript
export interface DegradationMetrics {
  // HSI (Hop Storage Index)
  hsi_initial: number           // 0-100
  hsi_current: number           // 0-100
  hsi_loss_rate: number         // Monthly degradation % (typically 0.15)
  
  // Grain Moisture
  grain_moisture_initial: number // %
  grain_moisture_current: number // %
  
  // PPG (Points Per Pound Per Gallon)
  ppg_initial: number           // 30-45 typical
  ppg_current: number           // Adjusted for losses
  
  // Tracking metadata
  received_date: string         // ISO date
  degradation_tracked: boolean
  storage_condition: 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'
  last_degradation_calc: string // ISO date
}

export interface InventoryItem extends DegradationMetrics {
  id: string
  brewery_id: string
  item_type: InventoryType
  name: string
  current_stock: number
  unit: string
  reorder_point: number
  lot_number?: string | null
  expiration_date?: string | null
  manufacturer?: string | null
  created_at: string
}

export interface DegradationLog {
  id: string
  inventory_id: string
  brewery_id: string
  hsi_before?: number
  hsi_after?: number
  grain_moisture_before?: number
  grain_moisture_after?: number
  ppg_before?: number
  ppg_after?: number
  change_reason: 'auto_calc' | 'manual_input' | 'storage_change' | 'quality_test'
  storage_condition_at_time: string
  days_elapsed: number
  logged_by: string
  created_at: string
}
```

### 2.2 Update `schemas.ts`
```typescript
export const degradationMetricsSchema = z.object({
  hsi_initial: z.number().min(0).max(100).optional(),
  hsi_current: z.number().min(0).max(100).optional(),
  grain_moisture_initial: z.number().min(0).max(30).optional(),
  grain_moisture_current: z.number().min(0).max(30).optional(),
  ppg_initial: z.number().min(20).max(50).optional(),
  ppg_current: z.number().min(20).max(50).optional(),
  received_date: z.string().date().optional(),
  storage_condition: z.enum(['cool_dry', 'cool_humid', 'room_temp', 'warm']).optional(),
  degradation_tracked: z.boolean().optional(),
})

export const inventorySchema = inventorySchema.merge(degradationMetricsSchema)
```

---

## Phase 3: Backend Logic

### 3.1 Degradation Calculation Engine (`lib/degradation.ts`)
Core algorithms for calculating ingredient degradation:

```typescript
/**
 * Calculate current HSI based on storage time and conditions
 * Formula: HSI_current = HSI_initial × (1 - (monthly_loss_rate × months_stored))
 * Storage conditions modify the loss rate multiplier
 */
export function calculateHSI(
  hsiInitial: number,
  receivedDate: Date,
  storageCondition: 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm',
  monthlyLossRate: number = 0.0015 // 0.15% per month default
): number

/**
 * Calculate grain moisture change based on storage conditions
 * Optimal: 8-12%, Higher values = faster degradation and mold risk
 */
export function calculateGrainMoisture(
  moistureInitial: number,
  receivedDate: Date,
  storageCondition: string,
  currentMoisture?: number // If manually measured
): number

/**
 * Adjust PPG based on grain degradation and HSI loss
 * PPG degrades with moisture and time: PPG_adjusted = PPG_initial × (1 - degradation_factor)
 */
export function calculatePPG(
  ppgInitial: number,
  hsiLossPct: number,
  grain_moisture_loss: number
): number

/**
 * Generate degradation alert if metrics cross safety thresholds
 */
export function generateDegradationAlert(metrics: DegradationMetrics): Alert | null
```

### 3.2 Server Action (`app/(app)/inventory/actions.ts`)
Add new actions:

```typescript
'use server'

/**
 * Recalculate all active degradation metrics for a brewery
 * Run daily via cron or on-demand by user
 */
export async function recalculateDegradationMetrics(breweryId: string): Promise<ActionResult<void>>

/**
 * Update inventory item with new degradation metrics
 * Logs the change in degradation_logs table
 */
export async function updateDegradationMetrics(
  inventoryId: string,
  metrics: Partial<DegradationMetrics>,
  reason: 'auto_calc' | 'manual_input' | 'storage_change' | 'quality_test'
): Promise<ActionResult<InventoryItem>>

/**
 * Change storage condition for an item (triggers recalculation)
 * e.g., Hops moved from "cool_dry" to "room_temp" → immediate HSI recalc
 */
export async function updateStorageCondition(
  inventoryId: string,
  newCondition: 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'
): Promise<ActionResult<InventoryItem>>

/**
 * Fetch degradation audit trail for an item
 */
export async function getDegradationHistory(inventoryId: string): Promise<ActionResult<DegradationLog[]>>
```

---

## Phase 4: Frontend Components

### 4.1 New Component: `DegradationCard.tsx`
Display metric cards with current values, alerts, and trends:

```typescript
interface DegradationCardProps {
  item: InventoryItem
  onUpdate?: (metrics: Partial<DegradationMetrics>) => void
}

// Show:
// - Current HSI with visual gauge (0-100)
// - Grain moisture % with optimal range highlights
// - PPG with loss % indicator
// - Days since received
// - Health status badge (Fresh | Degraded | Critical)
// - Storage condition selector
```

### 4.2 Update: `InventoryTable.tsx`
Add degradation columns and visual indicators:

```
| Item | Type | Stock | HSI | Moisture | PPG | Status | Actions |
|------|------|-------|-----|----------|-----|--------|---------|
| Columbus Hops | Hops | 2kg | 78% 📉 | - | - | ⚠️ Degraded | Edit |
| 2-Row Grain | Grain | 50kg | - | 11% | 36 | ✓ Fresh | Edit |
| Ale Yeast | Yeast | 10L | - | - | - | ✓ Fresh | Edit |
```

### 4.3 New Component: `DegradationDetailsModal.tsx`
Detailed view with:
- Metric history chart (HSI/moisture/PPG degradation over time)
- Audit log of all changes
- Manual override form
- Storage condition history

### 4.4 Update: `AddInventoryItemDialog.tsx`
Add degradation metric inputs for:
- Initial HSI (for hops only)
- Received date
- Storage condition selector
- Initial moisture (for grain)
- Initial PPG (for grain)

---

## Phase 5: UI/UX Enhancements

### 5.1 Visual Indicators
- **HSI Gauge**: 0-50% (Red), 50-75% (Yellow), 75-100% (Green)
- **Moisture Level**: 8-12% (Green), 12-15% (Yellow), >15% (Red)
- **PPG Loss**: Shows % decrease from original PPG with tooltip

### 5.2 Alerts & Notifications
- **HSI < 50%**: ⚠️ "Hops significantly degraded, IBU yield reduced"
- **Grain Moisture > 14%**: ⚠️ "High moisture detected, mold risk exists"
- **PPG Loss > 20%**: ⚠️ "Grain yield reduced by 20%, adjust recipe"

### 5.3 Storage Condition Toggle
Quick selector to change condition and immediately recalculate:
```
Storage: [Cool & Dry ▼] | Last Updated: 2 days ago
Options: Cool & Dry | Cool & Humid | Room Temp | Warm
```

---

## Phase 6: Cron Jobs & Automation

### 6.1 Daily Degradation Recalculation
```typescript
// Run daily at 2 AM UTC
// Triggered via: Vercel Cron / External scheduler
export async function degradationDailyRecalc() {
  // For each active brewery:
  //   - Fetch all inventory with degradation_tracked = true
  //   - Recalculate HSI/moisture/PPG
  //   - Create audit log entry if changes > 1%
  //   - Check for critical alerts
}
```

### 6.2 Expiration & Degradation Sync
- When `expiration_date` is reached, auto-flag degradation as CRITICAL
- Suggest disposal/use-by-date based on degradation metrics

---

## Phase 7: Integration Points

### 7.1 Recipe Management
- When selecting ingredient for recipe, show:
  - Current PPG (vs. recipe assumption)
  - HSI impact on IBU calculations
  - Suggestion to adjust quantities if significant degradation

### 7.2 Batch Logging
- When logging batch readings, allow brewers to note:
  - Actual IBU bitterness achieved vs. recipe target
  - Grain efficiency vs. expected PPG
  - Create feedback loop for future forecasting

### 7.3 Compliance & TTB Reporting
- Include degradation notes in TTB Form 5130.9 remarks
- Track ingredient quality as part of batch cost accounting

---

## Implementation Priority

### MVP (Phase 1-2)
- [x] Database schema additions
- [x] TypeScript types
- [x] Basic HSI calculation for hops
- [x] Degradation Card component
- [x] Update InventoryTable with degradation columns

### Phase 2 (Post-MVP)
- [ ] Grain moisture tracking UI
- [ ] PPG calculation and recipe integration
- [ ] Degradation audit history modal
- [ ] Storage condition selector
- [ ] Daily cron recalculation

### Phase 3 (Polish & Integration)
- [ ] Recipe system integration (adjust IBU/PPG based on degradation)
- [ ] Batch logging feedback loop
- [ ] TTB compliance integration
- [ ] Advanced analytics (degradation trends per supplier)

---

## Testing Checklist

### Unit Tests
- [ ] `calculateHSI()` with various time periods and storage conditions
- [ ] `calculateGrainMoisture()` degradation formula
- [ ] `calculatePPG()` accounts for losses correctly
- [ ] Alert thresholds trigger appropriately

### Integration Tests
- [ ] Degradation metrics update when inventory item is created
- [ ] Audit logs capture all changes
- [ ] Storage condition changes trigger recalculation
- [ ] Dates/timezones handled consistently

### E2E Tests
- [ ] Breweries can input degradation metrics via UI
- [ ] Metrics display correctly in inventory table
- [ ] Historical trends visible in modal
- [ ] Manual overrides persist correctly

---

## Success Metrics

1. **Adoption**: >60% of inventory items tracked for degradation within 30 days
2. **Accuracy**: HSI calculations match industry standards (±2% variance)
3. **Engagement**: Users interact with degradation alerts >3x/week
4. **Impact**: Breweries report 5-10% reduction in batch failures due to ingredient issues

---

## Dependencies & Tools

- **Calculation Engine**: TypeScript utility functions (no external lib needed)
- **Date Handling**: `date-fns` library (already in project)
- **Charts**: `recharts` for degradation trend visualization
- **Alerts**: Leverage existing toast/notification system

---

## Open Questions / Decisions

1. **Auto-reset frequency**: Should degradation reset on first use, or persist in calculation?
2. **Multi-lot tracking**: Should breweries track multiple lots separately in single item?
3. **Supplier defaults**: Should we pre-populate HSI loss rates by supplier?
4. **Mobile input**: How to capture manual moisture readings on mobile?

