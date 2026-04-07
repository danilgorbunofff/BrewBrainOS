import { z } from 'zod'

/**
 * BrewBrain OS — Zod Validation Schemas
 * Centralized schemas for consistent client-side and server-side validation.
 */

export const tankSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  capacity: z.number().positive('Capacity must be positive').optional(),
  status: z.enum(['ready', 'fermenting', 'conditioning', 'cleaning', 'maintenance']).default('ready'),
})

export const batchSchema = z.object({
  recipe_name: z.string().min(1, 'Recipe name is required').max(100, 'Name too long'),
  style: z.string().optional(),
  volume: z.number().positive('Volume must be positive').optional(),
  og: z.number().min(0.900).max(1.200, 'Invalid OG').optional(),
  fg: z.number().min(0.900).max(1.200, 'Invalid FG').optional(),
  status: z.enum(['brewing', 'fermenting', 'conditioning', 'packaging', 'complete']).default('brewing'),
})

export const degradationMetricsSchema = z.object({
  hsi_initial: z.number().min(0).max(100).nullable().optional(),
  hsi_current: z.number().min(0).max(100).nullable().optional(),
  hsi_loss_rate: z.number().min(0).max(1).default(0.15),  // 0-100% loss rate
  grain_moisture_initial: z.number().min(0).max(30).nullable().optional(),
  grain_moisture_current: z.number().min(0).max(30).nullable().optional(),
  ppg_initial: z.number().min(20).max(50).nullable().optional(),
  ppg_current: z.number().min(20).max(50).nullable().optional(),
  received_date: z.string().date().default(() => new Date().toISOString().split('T')[0]),
  storage_condition: z.enum(['cool_dry', 'cool_humid', 'room_temp', 'warm']).default('cool_dry'),
  degradation_tracked: z.boolean().default(false),
})

export const inventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  item_type: z.enum(['hop', 'grain', 'yeast', 'adjunct', 'packaging']),
  current_stock: z.number().min(0, 'Stock cannot be negative'),
  reorder_point: z.number().min(0, 'Reorder point cannot be negative').optional(),
  unit: z.string().min(1, 'Unit is required'),
  lot_number: z.string().optional().nullable(),
  expiration_date: z.string().date().optional().nullable(),  // ISO format YYYY-MM-DD
  manufacturer: z.string().optional().nullable(),
}).merge(degradationMetricsSchema)

export const brewerySchema = z.object({
  name: z.string().min(1, 'Brewery name is required').max(100, 'Name too long'),
})

export type TankInput = z.infer<typeof tankSchema>
export type BatchInput = z.infer<typeof batchSchema>
export type DegradationMetricsInput = z.infer<typeof degradationMetricsSchema>
export type InventoryInput = z.infer<typeof inventorySchema>

/**
 * Shrinkage & Inventory History Schemas
 */
export const inventoryChangeSchema = z.object({
  inventory_id: z.string().uuid('Invalid inventory ID'),
  previous_stock: z.number().min(0, 'Previous stock cannot be negative'),
  current_stock: z.number().min(0, 'Current stock cannot be negative'),
  change_type: z.enum(['stock_adjustment', 'recipe_usage', 'received', 'waste', 'other']).default('stock_adjustment'),
  reason: z.string().max(500, 'Reason too long').optional().nullable(),
  batch_id: z.string().uuid().optional().nullable(),
  provenance_ip: z.string().optional().nullable(),
  provenance_user_agent: z.string().optional().nullable(),
})

export const shrinkageAlertStatusSchema = z.enum([
  'unresolved',
  'acknowledged',
  'investigating',
  'resolved',
  'false_positive',
])

export const updateShrinkageAlertSchema = z.object({
  alert_id: z.string().uuid('Invalid alert ID'),
  status: shrinkageAlertStatusSchema,
  notes: z.string().max(1000, 'Notes too long').optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export type InventoryChangeInput = z.infer<typeof inventoryChangeSchema>
export type UpdateShrinkageAlertInput = z.infer<typeof updateShrinkageAlertSchema>

// ─────────────────────────────────────────────
// SUPPLIER TRACKING SCHEMAS
// ─────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_person: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  country: z.string().min(1, 'Country is required'),
  website: z.string().url('Invalid URL').optional().nullable(),
  supplier_type: z.enum(['Distributor', 'Direct', 'Cooperative']),
  years_partnered: z.number().min(0).optional().nullable(),
  specialty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid('Invalid supplier ID'),
  order_number: z.string().min(1, 'Order number is required'),
  order_date: z.string().date(),
  expected_delivery_date: z.string().date().optional().nullable(),
  actual_delivery_date: z.string().date().optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'canceled']).default('pending'),
  total_cost: z.number().min(0).optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  payment_status: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
  quality_rating: z.number().min(1).max(5).optional().nullable(),
  quality_notes: z.string().optional().nullable(),
  any_issues: z.boolean().default(false),
  issue_description: z.string().optional().nullable(),
})

export const supplierRatingSchema = z.object({
  supplier_id: z.string().uuid('Invalid supplier ID'),
  purchase_order_id: z.string().uuid().optional().nullable(),
  quality_rating: z.number().min(1).max(5),
  delivery_rating: z.number().min(1).max(5),
  reliability_rating: z.number().min(1).max(5),
  pricing_rating: z.number().min(1).max(5),
  comments: z.string().optional().nullable(),
  would_order_again: z.boolean(),
  rating_date: z.string(),
})

// ─────────────────────────────────────────────
// FERMENTATION & MONITORING SCHEMAS
// ─────────────────────────────────────────────

export const yeastLogSchema = z.object({
  batch_id: z.string().uuid('Invalid batch ID'),
  cell_density: z.number().min(0).optional().nullable(),
  viability_pct: z.number().min(0).max(100).optional().nullable(),
  pitch_rate: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const alertPreferencesSchema = z.object({
  stuck_fermentation: z.boolean().default(true),
  temperature_deviation: z.boolean().default(true),
  ph_out_of_range: z.boolean().default(true),
  do_spike: z.boolean().default(true),
  over_pressure: z.boolean().default(true),
  glycol_failure: z.boolean().default(true),
  push_enabled: z.boolean().default(true),
  in_app_enabled: z.boolean().default(true),
  severity_filter: z.enum(['all', 'critical_only']).default('all'),
})

// ─────────────────────────────────────────────
// COMPLIANCE SCHEMAS
// ─────────────────────────────────────────────

export const dailyOperationLogSchema = z.object({
  log_date: z.string().date(),
  operation_type: z.enum(['removal_taxpaid', 'removal_tax_free', 'return_to_brewery', 'breakage_destruction', 'other']),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  batch_id: z.string().uuid().optional().nullable(),
  inventory_id: z.string().uuid().optional().nullable(),
  ttb_reportable: z.boolean().default(true),
  remarks: z.string().optional().nullable(),
  provenance_ip: z.string().optional().nullable(),
  provenance_user_agent: z.string().optional().nullable(),
})

// ─────────────────────────────────────────────
// RECIPE SCHEMAS
// ─────────────────────────────────────────────

export const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  style: z.string().optional().nullable(),
  target_og: z.number().min(0.900).max(1.200).optional().nullable(),
  target_fg: z.number().min(0.900).max(1.200).optional().nullable(),
  target_ibu: z.number().min(0).max(200).optional().nullable(),
  target_abv: z.number().min(0).max(30).optional().nullable(),
  batch_size_bbls: z.number().positive(),
  notes: z.string().optional().nullable(),
})

export const recipeIngredientSchema = z.object({
  recipe_id: z.string().uuid(),
  inventory_item_id: z.string().uuid().optional().nullable(),
  ingredient_type: z.enum(['grain', 'hop', 'yeast', 'adjunct', 'water_treatment']),
  amount: z.number().positive(),
  unit: z.string().min(1),
  timing: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const batchBrewingLogSchema = z.object({
  batch_id: z.string().uuid(),
  log_type: z.enum(['brew_day', 'condition_check', 'packaging']),
  mashing_ph: z.number().min(0).max(14).optional().nullable(),
  boil_off_rate_pct: z.number().min(0).max(100).optional().nullable(),
  water_chemistry_notes: z.string().optional().nullable(),
  actual_ibu_calculated: z.number().min(0).optional().nullable(),
})

export type SupplierInput = z.infer<typeof supplierSchema>
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>
export type SupplierRatingInput = z.infer<typeof supplierRatingSchema>
export type YeastLogInput = z.infer<typeof yeastLogSchema>
export type AlertPreferencesInput = z.infer<typeof alertPreferencesSchema>
export type DailyOperationLogInput = z.infer<typeof dailyOperationLogSchema>
export type RecipeInput = z.infer<typeof recipeSchema>
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>
export type BatchBrewingLogInput = z.infer<typeof batchBrewingLogSchema>
