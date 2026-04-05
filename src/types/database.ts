/**
 * BrewBrain OS — Domain Database Types
 * Centralized union types for all status and category fields to ensure type safety.
 */

export type TierSlug = 'free' | 'nano' | 'production' | 'multi_site'

export type TankStatus = 
  | 'ready' 
  | 'fermenting' 
  | 'conditioning' 
  | 'cleaning' 
  | 'maintenance'

export type BatchStatus = 
  | 'brewing' 
  | 'fermenting' 
  | 'conditioning' 
  | 'packaging' 
  | 'complete'

export type InventoryType = 
  | 'Hops' 
  | 'Grain' 
  | 'Yeast' 
  | 'Adjunct' 
  | 'Packaging'

export type StorageCondition = 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'

export type DegradationChangeReason = 'auto_calc' | 'manual_input' | 'storage_change' | 'quality_test'

/** Degradation Metrics interface */
export interface DegradationMetrics {
  // HSI (Hop Storage Index) - 0 to 100%
  hsi_initial?: number | null
  hsi_current?: number | null
  hsi_loss_rate: number  // Monthly degradation % (typically 0.15)
  
  // Grain Moisture Content - percentage
  grain_moisture_initial?: number | null
  grain_moisture_current?: number | null
  
  // PPG (Points Per Pound Per Gallon) - 30-45 typical
  ppg_initial?: number | null
  ppg_current?: number | null
  
  // Tracking metadata
  received_date: string  // ISO date (YYYY-MM-DD)
  degradation_tracked: boolean
  storage_condition: StorageCondition
  last_degradation_calc: string  // ISO date
}

/** Inventory Item interface */
export interface InventoryItem extends DegradationMetrics {
  id: string
  brewery_id: string
  item_type: InventoryType
  name: string
  current_stock: number
  unit: string
  reorder_point: number
  lot_number?: string | null
  expiration_date?: string | null  // ISO date format (YYYY-MM-DD)
  manufacturer?: string | null
  created_at: string
}

/** Degradation Log - Audit trail for state changes */
export interface DegradationLog {
  id: string
  inventory_id: string
  brewery_id: string
  hsi_before?: number | null
  hsi_after?: number | null
  grain_moisture_before?: number | null
  grain_moisture_after?: number | null
  ppg_before?: number | null
  ppg_after?: number | null
  change_reason: DegradationChangeReason
  storage_condition_at_time: string
  days_elapsed: number
  logged_by: string
  created_at: string
}

/** Inventory History - Track all stock movements */
export interface InventoryHistory {
  id: string
  inventory_id: string
  brewery_id: string
  previous_stock: number
  current_stock: number
  quantity_change: number  // Positive or negative
  change_type: 'stock_adjustment' | 'recipe_usage' | 'received' | 'waste' | 'other'
  reason?: string | null
  batch_id?: string | null
  recorded_by?: string | null
  provenance_ip?: string | null
  provenance_user_agent?: string | null
  created_at: string
}

export type ShrinkageAlertType = 
  | 'unusual_single_loss'
  | 'pattern_degradation'
  | 'sudden_spike'
  | 'high_variance'
  | 'variance_threshold_exceeded'

export type ShrinkageSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ShrinkageAlertStatus = 'unresolved' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive'

/** Shrinkage Alert - Anomaly detection result */
export interface ShrinkageAlert {
  id: string
  inventory_id: string
  brewery_id: string
  severity: ShrinkageSeverity
  alert_type: ShrinkageAlertType
  expected_stock: number
  actual_stock: number
  loss_amount: number
  loss_percentage: number
  average_monthly_loss?: number | null
  z_score?: number | null
  confidence_score: number  // 0-100
  ttb_reportable?: boolean
  ttb_remarks?: string | null
  status: ShrinkageAlertStatus
  assigned_to?: string | null
  notes?: string | null
  resolved_at?: string | null
  detected_at: string
  created_at: string
}

/** Shrinkage Baseline - Statistical baseline for anomaly detection */
export interface ShrinkageBaseline {
  id: string
  inventory_id: string
  brewery_id: string
  analysis_period_days: number
  sample_count?: number | null
  average_monthly_loss: number
  monthly_loss_std_dev: number
  median_loss_percentage: number
  loss_threshold_warning: number  // Alert threshold %
  loss_threshold_critical: number  // Critical threshold %
  variance_multiplier: number
  last_calculated_at?: string | null
  updated_at: string
}

// ─────────────────────────────────────────────
// SUPPLIER TRACKING TYPES
// ─────────────────────────────────────────────

export type SupplierType = 'Distributor' | 'Direct' | 'Cooperative'

export type PurchaseOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'canceled'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export type SupplierRatingScale = 1 | 2 | 3 | 4 | 5

/** Supplier Profile */
export interface Supplier {
  id: string
  brewery_id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country: string
  website?: string | null
  supplier_type: SupplierType
  years_partnered?: number | null
  specialty?: string | null  // e.g., 'Hops', 'Grain', 'Yeast', 'All'
  notes?: string | null
  is_active: boolean
  avg_quality_rating: number
  avg_delivery_days: number
  total_orders: number
  created_at: string
  updated_at: string
}

/** Purchase Order Item (Line Item) */
export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_id?: string | null
  item_name: string
  quantity_ordered: number
  quantity_received: number
  unit: string  // 'kg', 'lb', 'oz', 'ea', 'bbl', etc.
  unit_price: number
  lot_number?: string | null
  expiration_date?: string | null  // ISO date format (YYYY-MM-DD)
  created_at: string
  updated_at: string
}

/** Purchase Order */
export interface PurchaseOrder {
  id: string
  brewery_id: string
  supplier_id: string
  order_number: string
  order_date: string  // ISO date format (YYYY-MM-DD)
  expected_delivery_date?: string | null  // ISO date format (YYYY-MM-DD)
  actual_delivery_date?: string | null  // ISO date format (YYYY-MM-DD)
  status: PurchaseOrderStatus
  items_summary?: Record<string, any> | null  // JSONB array of items
  total_cost?: number | null
  invoice_number?: string | null
  payment_status: PaymentStatus
  quality_rating?: number | null
  quality_notes?: string | null
  any_issues: boolean
  issue_description?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

/** Supplier Rating/Feedback */
export interface SupplierRating {
  id: string
  brewery_id: string
  supplier_id: string
  purchase_order_id?: string | null
  quality_rating: SupplierRatingScale
  delivery_rating: SupplierRatingScale
  reliability_rating: SupplierRatingScale
  pricing_rating: SupplierRatingScale
  comments?: string | null
  would_order_again: boolean
  rating_date: string
  rated_by?: string | null
  created_at: string
  updated_at: string
}

/** Supplier Performance Metrics */
export interface SupplierPerformanceMetrics {
  supplier_id: string
  total_orders: number
  avg_quality_rating: number
  avg_delivery_rating: number
  avg_reliability_rating: number
  avg_pricing_rating: number
  on_time_percentage: number  // % of orders delivered by expected date
  quality_issues_count: number
  avg_delivery_days: number
  last_order_date?: string | null
  total_spent?: number | null
  would_order_again_percentage: number  // % of ratings with true
}

// ─────────────────────────────────────────────
// FERMENTATION MONITORING TYPES
// ─────────────────────────────────────────────

export type FermentationAlertType =
  | 'stuck_fermentation'
  | 'temperature_deviation'
  | 'ph_out_of_range'
  | 'do_spike'
  | 'over_pressure'
  | 'glycol_failure'

export type FermentationAlertSeverity = 'warning' | 'critical'
export type FermentationAlertStatus = 'active' | 'acknowledged' | 'resolved'

/** Fermentation Alert — anomaly detection result stored in DB */
export interface FermentationAlert {
  id: string
  batch_id: string
  brewery_id: string
  alert_type: FermentationAlertType
  severity: FermentationAlertSeverity
  message: string
  threshold_value?: number | null  // the configured threshold that was breached
  actual_value?: number | null     // the value that triggered the alert
  status: FermentationAlertStatus
  acknowledged_by?: string | null
  acknowledged_at?: string | null
  resolved_at?: string | null
  created_at: string
}

/** Alert Preferences — per-user notification settings for Fermentation Alerts */
export interface AlertPreferences {
  id: string
  user_id: string
  brewery_id: string
  stuck_fermentation: boolean
  temperature_deviation: boolean
  ph_out_of_range: boolean
  do_spike: boolean
  over_pressure: boolean
  glycol_failure: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  severity_filter: 'all' | 'critical_only'
  updated_at: string
}

/** Yeast Log — cell density & viability tracking */
export interface YeastLog {
  id: string
  batch_id: string
  brewery_id: string
  cell_density?: number | null   // million cells per mL
  viability_pct?: number | null  // % viable cells (ideal: >85%)
  pitch_rate?: number | null     // million cells / mL / °Plato
  notes?: string | null
  logged_by?: string | null
  created_at: string
}

/** Batch Reading — sensor/manual reading for a batch */
export interface BatchReading {
  id: string
  batch_id: string
  gravity?: number | null
  temperature?: number | null
  ph?: number | null              // pH level (typical range 4.0–5.5)
  dissolved_oxygen?: number | null // DO in ppm
  pressure?: number | null        // Tank pressure in PSI
  notes?: string | null
  logger_id?: string | null
  created_at: string
}

/** Generic result object for all server actions */
export type ActionResult<T = any> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

// ─────────────────────────────────────────────
// COMPLIANCE AUTOMATION TYPES
// ─────────────────────────────────────────────

export type DailyOperationType =
  | 'removal_taxpaid'
  | 'removal_tax_free'
  | 'return_to_brewery'
  | 'breakage_destruction'
  | 'other'

/** Daily Operations Log — 27 CFR 25.292 compliant log */
export interface DailyOperationLog {
  id: string
  brewery_id: string
  log_date: string  // ISO date format (YYYY-MM-DD)
  operation_type: DailyOperationType
  quantity: number
  unit: string
  batch_id?: string | null
  inventory_id?: string | null
  ttb_reportable: boolean
  remarks?: string | null
  logged_by?: string | null
  provenance_ip?: string | null
  provenance_user_agent?: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// PROCESS OPTIMIZATION TYPES (Phase 1.4)
// ─────────────────────────────────────────────

export type RecipeIngredientType = 'grain' | 'hop' | 'yeast' | 'adjunct' | 'water_treatment'

export interface Recipe {
  id: string
  brewery_id: string
  name: string
  style?: string | null
  target_og?: number | null
  target_fg?: number | null
  target_ibu?: number | null
  target_abv?: number | null
  batch_size_bbls: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  inventory_item_id?: string | null
  ingredient_type: RecipeIngredientType
  amount: number
  unit: string
  timing?: string | null
  notes?: string | null
  created_at: string
}

export interface BatchBrewingLog {
  id: string
  batch_id: string
  brewery_id: string
  log_type: 'brew_day' | 'condition_check' | 'packaging'
  mashing_ph?: number | null
  boil_off_rate_pct?: number | null
  water_chemistry_notes?: string | null
  actual_ibu_calculated?: number | null
  logged_by?: string | null
  created_at: string
}

