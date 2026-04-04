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
