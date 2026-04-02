import { z } from 'zod'

/**
 * BrewBrain OS — Zod Validation Schemas
 * Centralized schemas for consistent client-side and server-side validation.
 */

export const tankSchema = z.object({
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

export const inventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  item_type: z.enum(['hop', 'grain', 'yeast', 'adjunct', 'packaging']),
  current_stock: z.number().min(0, 'Stock cannot be negative'),
  reorder_point: z.number().min(0, 'Reorder point cannot be negative').optional(),
  unit: z.string().min(1, 'Unit is required'),
})

export const brewerySchema = z.object({
  name: z.string().min(1, 'Brewery name is required').max(100, 'Name too long'),
})

export type TankInput = z.infer<typeof tankSchema>
export type BatchInput = z.infer<typeof batchSchema>
export type InventoryInput = z.infer<typeof inventorySchema>
