'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { supplierSchema, purchaseOrderSchema, supplierRatingSchema } from '@/lib/schemas'
import { sanitizeDbError } from '@/lib/utils'
import { 
  Supplier, 
  PurchaseOrder, 
  PurchaseOrderItem,
  SupplierRating,
  ActionResult,
  SupplierPerformanceMetrics
} from '@/types/database'

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface SupplierAnalytics {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  isActive: boolean;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  avgQualityRating: number;
  avgDeliveryRating: number;
  avgReliabilityRating: number;
  avgPricingRating: number;
  overallScore: number;
  onTimeDeliveryPercent: number;
  avgDeliveryDays: number;
  lateOrderCount: number;
  qualityIssueCount: number;
  qualityIssuePercent: number;
  wouldOrderAgainPercent: number;
  ratingsCount: number;
  periodDays: number;
}

export interface SupplierTrend {
  date: string;
  quality: number;
  delivery: number;
  reliability: number;
  pricing: number;
  overall: number;
}

// ─────────────────────────────────────────────
// SUPPLIER CRUD OPERATIONS
// ─────────────────────────────────────────────

/**
 * Get all suppliers for a brewery
 */
export async function getSuppliers(breweryId: string): Promise<ActionResult<Supplier[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('brewery_id', breweryId)
      .order('name')
    
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Get single supplier by ID
 */
export async function getSupplier(supplierId: string): Promise<ActionResult<Supplier>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Supplier not found')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(
  breweryId: string,
  supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'avg_quality_rating' | 'avg_delivery_days' | 'total_orders'>
): Promise<ActionResult<Supplier>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const parsed = supplierSchema.safeParse(supplierData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }
    
    const { data, error } = await supabase
      .from('suppliers')
      .insert([
        {
          ...parsed.data,
          brewery_id: breweryId,
          avg_quality_rating: 0,
          avg_delivery_days: 0,
          total_orders: 0,
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to create supplier')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Update existing supplier
 */
export async function updateSupplier(
  supplierId: string,
  supplierData: Partial<Supplier>
): Promise<ActionResult<Supplier>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        ...supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplierId)
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to update supplier')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Soft delete supplier (mark as inactive)
 */
export async function deleteSupplier(supplierId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', supplierId)
    
    if (error) throw error
    
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// SUPPLIER PERFORMANCE METRICS
// ─────────────────────────────────────────────

/**
 * Calculate performance metrics for a supplier
 */
export async function getSupplierPerformance(supplierId: string): Promise<ActionResult<SupplierPerformanceMetrics>> {
  try {
    const supabase = await createClient()
    
    // Get all ratings for supplier
    const { data: ratings, error: ratingsError } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
    
    if (ratingsError) throw ratingsError
    
    // Get all purchase orders for supplier
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
    
    if (ordersError) throw ordersError
    
    // Calculate metrics
    const totalOrders = orders?.length || 0
    const onTimeCount = orders?.filter(o => {
      if (!o.expected_delivery_date || !o.actual_delivery_date) return false
      return new Date(o.actual_delivery_date) <= new Date(o.expected_delivery_date)
    }).length || 0
    
    const onTimePercentage = totalOrders > 0 ? (onTimeCount / totalOrders) * 100 : 0
    
    const avgQualityRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.quality_rating, 0) / ratings.length
      : 0
    
    const avgDeliveryRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.delivery_rating, 0) / ratings.length
      : 0
    
    const avgReliabilityRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.reliability_rating, 0) / ratings.length
      : 0
    
    const avgPricingRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.pricing_rating, 0) / ratings.length
      : 0
    
    const qualityIssuesCount = orders?.filter(o => o.any_issues).length || 0
    
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('avg_delivery_days')
      .eq('id', supplierId)
      .single()
    
    const avgDeliveryDays = supplier?.avg_delivery_days || 0
    
    const lastOrder = orders?.sort((a, b) => 
      new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    )[0]
    
    const totalSpent = orders?.reduce((sum, o) => sum + (o.total_cost || 0), 0) || 0
    
    const wouldOrderAgainCount = ratings?.filter(r => r.would_order_again).length || 0
    const wouldOrderAgainPercentage = ratings && ratings.length > 0
      ? (wouldOrderAgainCount / ratings.length) * 100
      : 0
    
    const metrics: SupplierPerformanceMetrics = {
      supplier_id: supplierId,
      total_orders: totalOrders,
      avg_quality_rating: Number(avgQualityRating.toFixed(2)),
      avg_delivery_rating: Number(avgDeliveryRating.toFixed(2)),
      avg_reliability_rating: Number(avgReliabilityRating.toFixed(2)),
      avg_pricing_rating: Number(avgPricingRating.toFixed(2)),
      on_time_percentage: Number(onTimePercentage.toFixed(1)),
      quality_issues_count: qualityIssuesCount,
      avg_delivery_days: avgDeliveryDays,
      last_order_date: lastOrder?.order_date,
      total_spent: totalSpent,
      would_order_again_percentage: Number(wouldOrderAgainPercentage.toFixed(1)),
    }
    
    return { success: true, data: metrics }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// PURCHASE ORDER CRUD OPERATIONS
// ─────────────────────────────────────────────

/**
 * Get all purchase orders for a brewery
 */
export async function getPurchaseOrders(breweryId: string): Promise<ActionResult<PurchaseOrder[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('brewery_id', breweryId)
      .order('order_date', { ascending: false })
    
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Get single purchase order by ID
 */
export async function getPurchaseOrder(orderId: string): Promise<ActionResult<PurchaseOrder>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Purchase order not found')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(
  breweryId: string,
  supplierId: string,
  orderData: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'brewery_id' | 'supplier_id'>
): Promise<ActionResult<PurchaseOrder>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const parsed = purchaseOrderSchema.safeParse({ ...orderData, supplier_id: supplierId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([
        {
          ...parsed.data,
          brewery_id: breweryId,
          supplier_id: supplierId,
          created_by: user.id,
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to create purchase order')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Update purchase order
 */
export async function updatePurchaseOrder(
  orderId: string,
  orderData: Partial<PurchaseOrder>
): Promise<ActionResult<PurchaseOrder>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        ...orderData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to update purchase order')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Update purchase order status
 */
export async function updatePurchaseOrderStatus(
  orderId: string,
  status: PurchaseOrder['status']
): Promise<ActionResult<PurchaseOrder>> {
  return updatePurchaseOrder(orderId, { status })
}

/**
 * Delete purchase order (only if pending)
 */
export async function deletePurchaseOrder(orderId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    
    // Check order status
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', orderId)
      .single()
    
    if (order?.status !== 'pending') {
      throw new Error('Can only delete pending purchase orders')
    }
    
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId)
    
    if (error) throw error
    
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// PURCHASE ORDER ITEMS MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Get all items for a purchase order
 */
export async function getPurchaseOrderItems(orderId: string): Promise<ActionResult<PurchaseOrderItem[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', orderId)
    
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Add item to purchase order
 */
export async function addPurchaseOrderItem(
  orderId: string,
  itemData: Omit<PurchaseOrderItem, 'id' | 'created_at' | 'updated_at' | 'purchase_order_id'>
): Promise<ActionResult<PurchaseOrderItem>> {
  try {
    const supabase = await createClient()
    
    // Validate required fields
    if (!itemData.item_name) throw new Error('Item name is required')
    if (itemData.quantity_ordered <= 0) throw new Error('Quantity must be greater than 0')
    if (itemData.unit_price < 0) throw new Error('Unit price cannot be negative')
    
    const { data, error } = await supabase
      .from('purchase_order_items')
      .insert([
        {
          purchase_order_id: orderId,
          ...itemData,
          quantity_received: 0,
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to add item')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Update purchase order item
 */
export async function updatePurchaseOrderItem(
  itemId: string,
  itemData: Partial<PurchaseOrderItem>
): Promise<ActionResult<PurchaseOrderItem>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_order_items')
      .update({
        ...itemData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to update item')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Delete purchase order item
 */
export async function deletePurchaseOrderItem(itemId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('id', itemId)
    
    if (error) throw error
    
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// SUPPLIER RATINGS
// ─────────────────────────────────────────────

/**
 * Get all ratings for a supplier
 */
export async function getSupplierRatings(supplierId: string): Promise<ActionResult<SupplierRating[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('rating_date', { ascending: false })
    
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Create supplier rating
 */
export async function createSupplierRating(
  breweryId: string,
  ratingData: Omit<SupplierRating, 'id' | 'created_at' | 'updated_at' | 'brewery_id' | 'rating_date'>
): Promise<ActionResult<SupplierRating>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const parsed = supplierRatingSchema.safeParse({
      ...ratingData,
      rating_date: new Date().toISOString(),
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }
    
    const { data, error } = await supabase
      .from('supplier_ratings')
      .insert([
        {
          brewery_id: breweryId,
          ...parsed.data,
          rated_by: user.id,
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to create rating')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Update supplier rating
 */
export async function updateSupplierRating(
  ratingId: string,
  ratingData: Partial<SupplierRating>
): Promise<ActionResult<SupplierRating>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('supplier_ratings')
      .update({
        ...ratingData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ratingId)
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to update rating')
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Delete supplier rating
 */
export async function deleteSupplierRating(ratingId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('supplier_ratings')
      .delete()
      .eq('id', ratingId)
    
    if (error) throw error
    
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// SUPPLIER METRICS CALCULATIONS
// ─────────────────────────────────────────────

/**
 * Recalculate supplier performance metrics based on all ratings
 * Call this after creating a new supplier rating or delivery
 */
export async function recalculateSupplierMetrics(supplierId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Get all ratings for this supplier
    const { data: ratings, error: ratingsError } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)

    if (ratingsError) throw ratingsError

    // Get all purchase orders for delivery time calculation
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('status', 'delivered')

    if (ordersError) throw ordersError

    // Calculate averages
    let avgQualityRating = 0
    let avgDeliveryRating = 0
    let avgReliabilityRating = 0
    let avgPricingRating = 0
    let avgDeliveryDays = 0
    const totalOrders = orders?.length || 0

    if (ratings && ratings.length > 0) {
      avgQualityRating = ratings.reduce((sum, r) => sum + (r.quality_rating || 0), 0) / ratings.length
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      avgDeliveryRating = ratings.reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / ratings.length
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      avgReliabilityRating = ratings.reduce((sum, r) => sum + (r.reliability_rating || 0), 0) / ratings.length
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      avgPricingRating = ratings.reduce((sum, r) => sum + (r.pricing_rating || 0), 0) / ratings.length
    }

    if (orders && orders.length > 0) {
      let totalDays = 0
      let deliveredCount = 0

      for (const order of orders) {
        if (order.order_date && order.actual_delivery_date) {
          const orderDate = new Date(order.order_date)
          const deliveryDate = new Date(order.actual_delivery_date)
          const days = Math.floor((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
          if (days >= 0) {
            totalDays += days
            deliveredCount++
          }
        }
      }

      avgDeliveryDays = deliveredCount > 0 ? Math.round(totalDays / deliveredCount) : 0
    }

    // Update supplier with new metrics
    const { error: updateError } = await supabase
      .from('suppliers')
      .update({
        avg_quality_rating: Math.round(avgQualityRating * 10) / 10,
        avg_delivery_days: avgDeliveryDays,
        total_orders: totalOrders,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplierId)

    if (updateError) throw updateError

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

// ─────────────────────────────────────────────
// ANALYTICS FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Get comprehensive analytics for all suppliers in a brewery
 */
export async function getSupplierAnalytics(breweryId: string, daysBack: number = 90): Promise<ActionResult<SupplierAnalytics[]>> {
  try {
    const supabase = await createClient()

    // Get all suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('brewery_id', breweryId)

    if (suppliersError) throw suppliersError
    if (!suppliers || suppliers.length === 0) {
      return { success: true, data: [] }
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Build analytics for each supplier
    const analytics = await Promise.all(
      suppliers.map(async (supplier) => {
        // Get ratings for this period
        const { data: ratings } = await supabase
          .from('supplier_ratings')
          .select('*')
          .eq('supplier_id', supplier.id)
          .gte('rating_date', cutoffDateStr)

        // Get orders for this period
        const { data: orders } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('supplier_id', supplier.id)
          .gte('order_date', cutoffDateStr)

        // Calculate metrics
        let avgQuality = 0
        let avgDelivery = 0
        let avgReliability = 0
        let avgPricing = 0
        let wouldOrderAgainCount = 0

        if (ratings && ratings.length > 0) {
          avgQuality = ratings.reduce((sum, r) => sum + (r.quality_rating || 0), 0) / ratings.length
          avgDelivery = ratings.reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / ratings.length
          avgReliability = ratings.reduce((sum, r) => sum + (r.reliability_rating || 0), 0) / ratings.length
          avgPricing = ratings.reduce((sum, r) => sum + (r.pricing_rating || 0), 0) / ratings.length
          wouldOrderAgainCount = ratings.filter(r => r.would_order_again).length
        }

        // Calculate delivery metrics
        let onTimeCount = 0
        let totalDeliveryDays = 0
        let deliveredCount = 0
        let totalSpent = 0
        let qualityIssueCount = 0

        if (orders && orders.length > 0) {
          for (const order of orders) {
            totalSpent += order.total_cost || 0

            if (order.status === 'delivered' && order.order_date && order.actual_delivery_date) {
              const expectedDate = order.expected_delivery_date ? new Date(order.expected_delivery_date) : null
              const actualDate = new Date(order.actual_delivery_date)

              if (expectedDate && actualDate <= expectedDate) {
                onTimeCount++
              }

              const orderDate = new Date(order.order_date)
              const days = Math.floor((actualDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
              totalDeliveryDays += days
              deliveredCount++
            }

            if (order.any_issues) {
              qualityIssueCount++
            }
          }
        }

        const onTimePercent = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 0
        const avgDeliveryDays = deliveredCount > 0 ? Math.round(totalDeliveryDays / deliveredCount) : 0
        const qualityIssuePercent = (orders?.length || 0) > 0 ? Math.round((qualityIssueCount / (orders?.length || 1)) * 100) : 0
        const avgOrderValue = (orders?.length || 0) > 0 ? totalSpent / (orders?.length || 1) : 0

        const overallScore = (avgQuality + avgDelivery + avgReliability + avgPricing) / 4

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierType: supplier.supplier_type,
          isActive: supplier.is_active,
          
          totalOrders: orders?.length || 0,
          totalSpent,
          avgOrderValue,
          
          avgQualityRating: Math.round(avgQuality * 10) / 10,
          avgDeliveryRating: Math.round(avgDelivery * 10) / 10,
          avgReliabilityRating: Math.round(avgReliability * 10) / 10,
          avgPricingRating: Math.round(avgPricing * 10) / 10,
          overallScore: Math.round(overallScore * 10) / 10,
          
          onTimeDeliveryPercent: onTimePercent,
          avgDeliveryDays,
          lateOrderCount: deliveredCount - onTimeCount,
          
          qualityIssueCount,
          qualityIssuePercent,
          wouldOrderAgainPercent: ratings && ratings.length > 0 ? Math.round((wouldOrderAgainCount / ratings.length) * 100) : 0,
          
          ratingsCount: ratings?.length || 0,
          periodDays: daysBack,
        }
      })
    )

    return { success: true, data: analytics }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Get performance trends for a supplier over time
 */
export async function getSupplierTrends(supplierId: string, daysBack: number = 90): Promise<ActionResult<SupplierTrend[]>> {
  try {
    const supabase = await createClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Get ratings ordered by date
    const { data: ratings, error } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('rating_date', cutoffDateStr)
      .order('rating_date', { ascending: true })

    if (error) throw error

    // Group by date and calculate daily averages
    const trendMap = new Map<string, { date: string, ratings: SupplierRating[] }>()

    if (ratings && ratings.length > 0) {
      for (const rating of ratings) {
        const date = new Date(rating.rating_date).toISOString().split('T')[0]

        if (!trendMap.has(date)) {
          trendMap.set(date, {
            date,
            ratings: [],
          })
        }

        const entry = trendMap.get(date)
        if (entry) {
          entry.ratings.push(rating)
        }
      }
    }

    // Calculate rolling averages
    const trends = Array.from(trendMap.values()).map((entry) => {
      const ratings = entry.ratings
      const avgQuality = ratings.reduce((sum: number, r: SupplierRating) => sum + (r.quality_rating || 0), 0) / ratings.length
      const avgDelivery = ratings.reduce((sum: number, r: SupplierRating) => sum + (r.delivery_rating || 0), 0) / ratings.length
      const avgReliability = ratings.reduce((sum: number, r: SupplierRating) => sum + (r.reliability_rating || 0), 0) / ratings.length
      const avgPricing = ratings.reduce((sum: number, r: SupplierRating) => sum + (r.pricing_rating || 0), 0) / ratings.length

      return {
        date: entry.date,
        quality: Math.round(avgQuality * 10) / 10,
        delivery: Math.round(avgDelivery * 10) / 10,
        reliability: Math.round(avgReliability * 10) / 10,
        pricing: Math.round(avgPricing * 10) / 10,
        overall: Math.round(((avgQuality + avgDelivery + avgReliability + avgPricing) / 4) * 10) / 10,
      }
    })

    return { success: true, data: trends }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}

/**
 * Get quality issues for a supplier
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSupplierQualityIssues(supplierId: string, breweryId: string, daysBack: number = 90): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Get orders with issues
    const { data: ordersWithIssues } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('brewery_id', breweryId)
      .eq('any_issues', true)
      .gte('order_date', cutoffDateStr)

    // Get ratings
    const { data: ratings } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('brewery_id', breweryId)
      .gte('rating_date', cutoffDateStr)

    // Get all orders for percentage
    const { data: allOrders } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('brewery_id', breweryId)
      .gte('order_date', cutoffDateStr)

    const issueCount = ordersWithIssues?.length || 0
    const totalOrders = allOrders?.length || 0
    const issuePercent = totalOrders > 0 ? Math.round((issueCount / totalOrders) * 100) : 0

    // Extract unique issues from comments
    const issueList: Record<string, number> = {}
    if (ratings) {
      for (const rating of ratings) {
        if (rating.comments) {
          // Simple word extraction - in production would use NLP
          const words = rating.comments.toLowerCase().split(/\s+/)
          words.forEach((word: string) => {
            if (word.length > 3) {
              issueList[word] = (issueList[word] || 0) + 1
            }
          })
        }
      }
    }

    return {
      success: true,
      data: {
        issueOrderCount: issueCount,
        totalOrdersReviewed: totalOrders,
        issuePercent,
        recentIssueOrders: ordersWithIssues?.slice(0, 5) || [],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        lowQualityRatings: ratings?.filter((e: unknown) => (r.quality_rating || 0) < 3) || [],
      },
    }
  } catch (error) {
    return { success: false, error: sanitizeDbError(error, 'supplier-actions') }
  }
}
