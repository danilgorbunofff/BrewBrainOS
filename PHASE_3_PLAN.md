# Phase 3: Supplier Performance Analytics (Weeks 5-6)

## Overview
Build comprehensive analytics dashboard for supplier performance metrics, trends, and comparisons. Enable breweries to make data-driven decisions about supplier relationships and identify quality/delivery/reliability patterns.

## Phase 3 Goals
- ✅ Supplier performance dashboard with KPI cards
- ✅ Performance trends visualization (charts over time)
- ✅ Supplier comparison view (side-by-side metrics)
- ✅ Quality trend analysis with alerts
- ✅ Delivery performance analytics
- ✅ Payment tracking dashboard
- ✅ Advanced filtering & export

---

## Architecture

### Database Queries Needed
- Aggregate supplier ratings by dimension (quality/delivery/reliability/pricing)
- Calculate performance trends (last 30/90/365 days)
- Supplier comparison queries
- Quality issue frequency analysis
- Delivery time distribution
- Payment status summaries

### Components to Build

#### 1. **SupplierAnalyticsDashboard** (~400 lines)
Main analytics hub with:
- Summary KPI cards (avg quality, on-time %, avg cost/order)
- Period selector (30/90/365 days)
- Supplier selector for filtering
- Navigation tabs to different views

#### 2. **PerformanceTrendChart** (~250 lines)
Line chart showing:
- Quality rating trend
- Delivery days trend
- Reliability trend
- Pricing comparison trend
- Date range: last 30/90/365 days

#### 3. **SupplierComparisonTable** (~300 lines)
Compare multiple suppliers side-by-side:
- All 4 rating dimensions
- Order count
- Avg spend
- On-time delivery %
- Quality issue frequency
- Color coding for rankings

#### 4. **QualityAnalysisPanel** (~250 lines)
Quality deep-dive:
- Issue frequency by supplier
- Common issues list
- Quality trend chart
- Alert threshold indicators
- Would-order-again percentage

#### 5. **DeliveryAnalyticsPanel** (~250 lines)
Delivery performance:
- On-time delivery percentage
- Avg delivery days
- Delivery reliability chart
- Late order frequency
- Distribution of delivery times

#### 6. **PaymentTrackingPanel** (~200 lines)
Payment status view:
- Unpaid invoice count
- Total outstanding
- Partially paid orders
- Payment status by supplier
- Average days to payment

#### 7. **SupplierScorecard** (~300 lines)
Individual supplier detail card:
- Overall score (1-5)
- 4 dimension scores
- Total orders metrics
- Quality issue ratio
- On-time delivery %
- Risk indicators (trending down)
- Action buttons (place order, contact, view all orders)

### Pages to Build

#### `/analytics/suppliers`
Main analytics dashboard with all summary KPIs and filters

#### `/analytics/suppliers/[id]`
Detailed supplier performance view with full scorecard

#### `/analytics/performance-trends`
Time-series analytics with detailed trend charts

#### `/analytics/quality-issues`
Quality problem tracking and analysis

#### `/analytics/delivery-performance`
Delivery metrics and reliability tracking

#### `/analytics/payment-status`
Payment status and reconciliation view

---

## Implementation Steps

### Step 1: Create Core Analytics Components
1. SupplierAnalyticsDashboard (main hub)
2. PerformanceTrendChart (with Recharts)
3. SupplierComparisonTable (sortable, filterable)
4. SupplierScorecard (reusable card)

### Step 2: Create Specialized Panels
5. QualityAnalysisPanel
6. DeliveryAnalyticsPanel
7. PaymentTrackingPanel

### Step 3: Add Server Actions
- `getSupplierAnalytics()` - All suppliers with aggregated metrics
- `getSupplierDetail()` - Full supplier performance data
- `getPerformanceTrends()` - Historical trend data
- `getQualityIssues()` - Issue analysis
- `getDeliveryMetrics()` - Delivery performance data
- `getPaymentStatus()` - Payment tracking

### Step 4: Build Pages
- `/analytics/suppliers` (dashboard)
- `/analytics/suppliers/[id]` (detail view)
- `/analytics/performance-trends` (trend analysis)
- `/analytics/quality-issues` (issue tracking)
- `/analytics/delivery-performance` (delivery view)
- `/analytics/payment-status` (payment view)

### Step 5: Add Navigation
- Update sidebar to link `/analytics`
- Add analytics menu in app layout

---

## Data Model

### Analytics Aggregates (Calculated Live)
```typescript
interface SupplierAnalytics {
  supplierId: string
  supplierName: string
  totalOrders: number
  avgQualityRating: number
  avgDeliveryRating: number
  avgReliabilityRating: number
  avgPricingRating: number
  overallScore: number
  
  onTimeDeliveryPercent: number
  avgDeliveryDays: number
  lateOrderCount: number
  
  totalSpent: number
  avgOrderValue: number
  
  qualityIssueCount: number
  wouldOrderAgainPercent: number
  
  unpaidAmount: number
  partiallyPaidCount: number
  avgDaysToPayment: number
}

interface PerformanceTrend {
  date: string
  qualityRating: number
  deliveryDays: number
  reliabilityRating: number
  pricingRating: number
}

interface SupplierComparison {
  supplier1Analytics: SupplierAnalytics
  supplier2Analytics: SupplierAnalytics
  differences: {
    qualityDiff: number
    deliveryDiff: number
    costDiff: number
  }
}
```

---

## Visualization Libraries
- **Recharts** - Line/bar charts for trends
- **Shadcn/ui** - Data tables, cards, tabs
- **Tailwind CSS** - Styling, color coding

### Color System
- 🟢 Green (4-5 stars) - Excellent
- 🟡 Yellow (2.5-3.5 stars) - Average
- 🔴 Red (1-2 stars) - Poor
- 🔵 Blue (Trending down) - Warning

---

## Key Features

### Smart Alerts
- Quality declining (avg rating dropped >0.5 in 30 days)
- Delivery delays (last 3 orders late)
- High issue frequency (>20% of orders)
- High payment delays (avg >45 days)

### Filtering & Export
- Date range selector (30/90/365 days, custom)
- Supplier multi-select
- Export to CSV (analytics summary)
- Save custom reports (future enhancement)

### Performance Optimizations
- Aggregate metrics cached for 24 hours
- Trend queries limited to 365 days max
- Virtual scrolling for large tables
- Lazy load charts on tab change

---

## Success Criteria

✅ Dashboard loads all suppliers with performance metrics  
✅ Trend charts render correctly for 30/90/365 day periods  
✅ Supplier comparison shows meaningful differences  
✅ Quality and delivery panels identify patterns  
✅ Payment tracking visible at a glance  
✅ Individual supplier scorecards comprehensive  
✅ All pages responsive on mobile  
✅ Alerts trigger for declining performance  

---

## Timeline Estimate
- Server actions: 2-3 hours
- Components: 4-5 hours
- Pages & integration: 2-3 hours
- Testing & polish: 2 hours
- **Total: ~10-14 hours**

---

## Notes for Phase 4 (Smart Reorder)
Phase 3 creates the foundation for Phase 4:
- Analytics data feeds smart recommendation engine
- Quality scores determine trusted suppliers for reorder
- Delivery metrics help estimate lead times
- Payment data informs order timing
