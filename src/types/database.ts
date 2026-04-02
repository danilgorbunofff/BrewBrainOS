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
  | 'hop' 
  | 'grain' 
  | 'yeast' 
  | 'adjunct' 
  | 'packaging'

/** Generic result object for all server actions */
export type ActionResult<T = any> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }
