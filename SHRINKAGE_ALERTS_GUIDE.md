# Shrinkage Alerts Feature Documentation

## Overview

The Shrinkage Alerts system is an advanced anomaly detection engine that identifies unusual inventory losses and discrepancies. It helps breweries detect and prevent:

- **Leakage/Evaporation**: Gradual unplanned losses
- **Systematic Theft**: Consistent unauthorized removal of inventory
- **Equipment Malfunctions**: Unexpected spills or failures
- **Data Entry Errors**: Inconsistent or volatile tracking patterns
- **Waste**: Intentional but unrecorded disposal

## Architecture

### Three-Layer Detection System

```
┌─────────────────────────────────────────────────────────┐
│  User Action: Record Inventory Change                   │
│  (Manual adjustment, recipe usage, receipt, waste)      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Historical Tracking                           │
│  - Store every stock change in inventory_history table  │
│  - Record change type, reason, timestamp, user          │
│  - Create complete audit trail                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Baseline Calculation                          │
│  - Analyze 90 days of history                           │
│  - Calculate average monthly loss (mean, std dev)       │
│  - Establish normal variance thresholds                 │
│  - Update shrinkage_baselines table                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Anomaly Detection                             │
│  - Apply 4+ statistical algorithms                      │
│  - Compare current loss to baseline                     │
│  - Generate severity score & confidence                 │
│  - Create shrinkage_alerts record if anomaly found      │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Three Core Tables

#### 1. `inventory_history`
Audit trail of all stock changes.

```sql
inventory_id        -- Which item was adjusted
brewery_id          -- Which brewery
previous_stock      -- Stock before change
current_stock       -- Stock after change
quantity_change     -- Positive or negative delta
change_type         -- stock_adjustment|recipe_usage|received|waste|other
reason              -- Description of why (optional)
batch_id            -- Link to batch if recipe usage
recorded_by         -- Which user made the change
created_at          -- When the change was recorded
```

#### 2. `shrinkage_baselines`
Statistical baselines for anomaly detection.

```sql
inventory_id              -- Which item
brewery_id                -- Which brewery
average_monthly_loss      -- Expected loss rate (units/month)
monthly_loss_std_dev      -- Statistical variance
median_loss_percentage    -- Typical % loss
loss_threshold_warning    -- Alert if loss > 5% (configurable)
loss_threshold_critical   -- Alert if loss > 15% (configurable)
variance_multiplier       -- Alert if variance > 2.5x baseline
sample_count              -- How many data points in calculation
last_calculated_at        -- When baseline was last updated
```

#### 3. `shrinkage_alerts`
Detected anomalies requiring user attention.

```sql
inventory_id          -- Which item lost stock
brewery_id            -- Which brewery
severity              -- low|medium|high|critical
alert_type            -- Type of anomaly detected
expected_stock        -- What stock should be
actual_stock          -- What stock is
loss_amount           -- Absolute loss quantity
loss_percentage       -- % loss
z_score               -- Statistical deviation score
confidence_score      -- 0-100: how confident is detection
status                -- unresolved|acknowledged|investigating|resolved|false_positive
assigned_to           -- User assigned to investigate
notes                 -- Investigation notes
detected_at           -- When anomaly was detected
resolved_at           -- When alert was resolved
```

## Anomaly Detection Algorithms

The system uses four independent detection methods and reports the one with highest confidence:

### 1. Unusual Single Loss Detection
Identifies outlier losses that deviate significantly from recent patterns.

**Algorithm:**
- Extract last 10 loss events
- Calculate mean and standard deviation
- Compute Z-score of current loss
- If |Z| > 2.0: **Anomaly detected**

**Use Case:** Sudden spill, equipment failure, one-time theft

**Severity:** Based on loss percentage
- 0-5%: Low
- 5-15%: Medium
- 15-30%: High
- 30%+: Critical

### 2. Pattern Degradation Detection
Identifies consistent, gradual losses suggesting leaks or evaporation.

**Algorithm:**
- Analyze last 30 days of losses
- Calculate coefficient of variation (std_dev / mean)
- If CV < 0.5 AND mean loss > 0: **Pattern found**

**Use Case:** Equipment leak, evaporation, slow tank drainage

**Severity:** Always Medium (pattern suggests ongoing issue)

### 3. Sudden Spike Detection
Identifies large drops compared to established baseline.

**Algorithm:**
- Compare current loss to monthly baseline
- Calculate deviation: loss - baseline_mean
- If deviation > 2× baseline_mean AND |Z| > 1.5: **Spike detected**

**Use Case:** Major spill, intentional dumping, equipment failure

**Severity:** High (immediate incident)

### 4. High Variance Detection
Identifies inconsistent stock levels suggesting data tracking problems.

**Algorithm:**
- Analyze all quantity changes in history
- If std_dev > 2× mean AND std_dev > 0: **Variance detected**

**Use Case:** Inconsistent data entry, frequent small adjustments, manual counting variability

**Severity:** Medium (tracking issue)

### 5. Threshold Exceeded Detection
Fallback when loss exceeds configured thresholds but no pattern detected.

**Algorithm:**
- If loss_percentage > warning_threshold: **Alert**

**Use Case:** Generic significant loss

**Severity:** Based on percentage

## Statistical Metrics Used

### Z-Score
Measures how many standard deviations a value is from the mean.

$$Z = \frac{X - \mu}{\sigma}$$

Where:
- $X$ = Current observation
- $\mu$ = Mean of historical data
- $\sigma$ = Standard deviation

**Interpretation:**
- |Z| > 2.5: 99.4% confidence anomaly (critical)
- |Z| > 2.0: 95.5% confidence anomaly (significant)
- |Z| > 1.5: 86.6% confidence anomaly (concerning)
- |Z| < 1.0: Normal variation (no alert)

### Coefficient of Variation
Measures consistency of losses as ratio of std dev to mean.

$$CV = \frac{\sigma}{\mu}$$

**Interpretation:**
- CV < 0.5: Very consistent pattern (degradation)
- CV 0.5-1.0: Moderate consistency
- CV > 1.0: High variability (tracking issues)

## API Reference

### `recordInventoryChange()`
Records a stock change and triggers shrinkage detection.

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

**Flow:**
1. Create entry in `inventory_history`
2. Automatically trigger `recalculateShrinkageBaseline()`
3. Automatically trigger `detectAndCreateShrinkageAlert()`

### `recalculateShrinkageBaseline()`
Analyzes 90-day history and updates baseline metrics.

```typescript
recalculateShrinkageBaseline(
  inventory_id: string
): Promise<ActionResult>
```

**Triggers when:**
- New inventory history record is created
- User manually requests baseline recalculation

**Calculates:**
- Average monthly loss
- Monthly loss standard deviation
- Median loss percentage
- Sample count

### `detectAndCreateShrinkageAlert()`
Runs anomaly detection algorithms and creates alert if needed.

```typescript
detectAndCreateShrinkageAlert(
  inventory_id: string
): Promise<ActionResult<ShrinkageAlert | null>>
```

**Returns:**
- `null` if no anomaly detected
- `ShrinkageAlert` object if anomaly found

### `getShrinkageAlerts()`
Retrieves alerts for a brewery.

```typescript
getShrinkageAlerts(status?: string): Promise<ActionResult<ShrinkageAlert[]>>
```

**Status values:**
- `'all'` - All alerts
- `'unresolved'` - Only unresolved
- `'resolved'` - Only resolved
- `'false_positive'` - Only false positives

### `updateShrinkageAlertStatus()`
Updates alert status and allows for investigation notes.

```typescript
updateShrinkageAlertStatus(
  alert_id: string,
  status: 'unresolved' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive',
  notes?: string,
  assigned_to?: string
): Promise<ActionResult>
```

**Status meanings:**
- `unresolved` - New alert, not yet reviewed
- `acknowledged` - User has seen it
- `investigating` - Root cause analysis in progress
- `resolved` - Issue addressed or corrected
- `false_positive` - Detection was incorrect

### `getShrinkageStats()`
Gets summary statistics for a brewery.

```typescript
getShrinkageStats(): Promise<ActionResult<{
  total_alerts: number
  critical_alerts: number
  this_month_loss: number
  average_monthly_loss: number
}>>
```

## Integration Examples

### 1. Basic Usage in Inventory Component

```typescript
import { recordInventoryChange } from '@/app/actions/shrinkage'

// When user adjusts inventory
const handleStockAdjustment = async (inventoryId, oldStock, newStock) => {
  const result = await recordInventoryChange(
    inventoryId,
    oldStock,
    newStock,
    'stock_adjustment',
    'Inventory count reconciliation'
  )
  
  if (result.success) {
    toast.success('Stock updated')
    // Shrinkage analysis automatically triggered
  }
}
```

### 2. Display Shrinkage Dashboard

```typescript
import { ShrinkageDashboard } from '@/components/ShrinkageDashboard'

// In your inventory page
export default function InventoryPage() {
  return (
    <div>
      <ShrinkageDashboard 
        maxAlerts={10} 
        showStats={true}
      />
    </div>
  )
}
```

### 3. Inventory Adjustment Dialog

```typescript
import { InventoryAdjustmentDialog } from '@/components/InventoryAdjustmentDialog'

export function InventoryRow({ item }) {
  const [showDialog, setShowDialog] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowDialog(true)}>Adjust Stock</button>
      
      {showDialog && (
        <InventoryAdjustmentDialog
          inventoryId={item.id}
          inventoryName={item.name}
          currentStock={item.current_stock}
          unit={item.unit}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            // Reload inventory data
          }}
        />
      )}
    </>
  )
}
```

## Configuration

### Loss Thresholds
Located in `shrinkage_baselines.sql`:

```sql
loss_threshold_warning = 5    -- % loss triggers warning
loss_threshold_critical = 15  -- % loss triggers critical alert
```

### Variance Multiplier
```sql
variance_multiplier = 2.5     -- Alert if variance > 2.5× typical
```

### Analysis Period
Currently set to 90 days. Adjust in `calculateShrinkageBaseline()`:

```typescript
const baselineMetrics = calculateShrinkageBaseline(history || [], 90) // Change 90 to your period
```

## Calibration & Tuning

### For High-Loss Items
Some items naturally have higher loss rates (evaporation, etc.). You can:

1. Adjust `loss_threshold_warning` and `loss_threshold_critical` per item
2. Mark item as `degradation_tracked: false` to disable monitoring
3. Classify losses as `waste` to exclude from anomaly detection

### For Seasonal Variation
If losses vary by season:

1. Track change_type carefully (recipe_usage, waste, etc.)
2. Let baseline build up 90+ days of history
3. System will automatically adjust thresholds

### Reducing False Positives
If seeing too many alerts:

1. Increase `loss_threshold_warning` from 5% to 7-10%
2. Increase `variance_multiplier` from 2.5 to 3.0+
3. Mark false positives as "false_positive" status
4. Review "reason" field to improve classifications

## Performance Considerations

- **Baseline recalculation:** Runs on every stock change (O(n) where n=30-90 records)
- **Anomaly detection:** Runs on every stock change (O(n) with 4 algorithms)
- **Alert creation:** Only creates record if anomaly detected (minimal overhead)
- **Indexing:** Automatic indexes on `inventory_id`, `brewery_id`, `created_at`, `status`

For optimal performance:
- Encourage users to batch adjustments when possible
- Archive old alerts monthly
- Review false positives to retrain system

## Future Enhancements

1. **Machine Learning:** Adaptive thresholds using historical patterns
2. **Predictive Analysis:** Forecast likely losses based on item type and conditions
3. **Alerts Integration:** Send notifications to mobile/Slack when critical alerts detected
4. **Root Cause Analysis:** Suggest likely causes based on alert type
5. **Correlated Analysis:** Detect when multiple items lose stock simultaneously (equipment failure)
6. **Seasonal Adjustment:** Automatically adjust thresholds by season/usage pattern
7. **Blend Analysis:** Correlate inventory shrinkage with batch yield data

## Troubleshooting

### Question: Why am I not seeing alerts?

**Possible reasons:**
1. Need at least 5 history records before detection starts
2. Loss is within normal threshold (< 5%)
3. First 90 days: system building baseline

**Solution:** Wait 90+ days of activity, or artificially trigger by making large adjustment

### Question: Getting too many alerts

**Solution:**
1. Review false positives - mark as "false_positive"
2. Increase loss_threshold_warning (5%→10%)
3. Verify change_type is correctly classified (recipe_usage vs waste)

### Question: Alerts for expected losses (normal evaporation)

**Solution:**
1. Mark those items with degradation_tracked=false
2. Or classify changes as "waste" instead of "stock_adjustment"
3. This trains baseline to exclude those losses

### Question: Missing alerts for suspicious losses

**Solution:**
1. Decrease loss_threshold_warning (5%→3%)
2. Decrease variance_multiplier (2.5→2.0)
3. Review recent history - needs enough data for comparison

## Related Features

- **Degradation Metrics**: Tracks ingredient freshness (HSI, moisture, PPG)
- **Inventory History**: Audit trail of all changes
- **Activity Logs**: User action tracking
- **Reports**: TTB Form 5130.9, batch yield reports

---

**Last Updated:** April 2026
**Version:** 1.0
