'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionResult, PurchaseOrder, PurchaseOrderItem, Supplier } from '@/types/database'
import { 
  updatePurchaseOrder, 
  updatePurchaseOrderItem,
  createSupplierRating,
  recalculateSupplierMetrics
} from '@/app/actions/supplier-actions'
import { adjustInventoryStock } from '@/app/(app)/inventory/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucideArrowLeft, LucideSave, LucideAlertCircle, LucideCheckCircle } from 'lucide-react'
import Link from 'next/link'

interface ReceiveOrderFormProps {
  breweryId: string
  order: PurchaseOrder
  items: PurchaseOrderItem[]
  supplier: Supplier
  onSuccess?: () => void
}

interface ReceiveState {
  [itemId: string]: {
    quantity_received: number
    lot_number?: string
    expiration_date?: string
  }
}

export function ReceiveOrderForm({
  breweryId,
  order,
  items,
  supplier,
  onSuccess
}: ReceiveOrderFormProps) {
  const router = useRouter()
  const [receiveState, setReceiveState] = useState<ReceiveState>(
    items.reduce((acc, item) => ({
      ...acc,
      [item.id]: {
        quantity_received: item.quantity_received || 0,
        lot_number: item.lot_number,
        expiration_date: item.expiration_date,
      }
    }), {})
  )
  const [qualityIssues, setQualityIssues] = useState<string>('')
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [qualityRating, setQualityRating] = useState<number>(5)
  const [supplierRatings, setSupplierRatings] = useState({
    quality: 5,
    delivery: 5,
    reliability: 5,
    pricing: 5,
  })

  // Handle quantity change
  const handleQuantityChange = (itemId: string, value: number) => {
    setReceiveState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity_received: value
      }
    }))
  }

  // Handle form submission
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = async (formData: FormData): Promise<ActionResult> => {
    try {
      // Update order to delivered
      const orderUpdate = await updatePurchaseOrder(order.id, {
        status: 'delivered',
        actual_delivery_date: new Date().toISOString().split('T')[0],
        any_issues: qualityIssues.length > 0,
        issue_description: qualityIssues || null,
      })

      if (!orderUpdate.success) {
        throw new Error(orderUpdate.error)
      }

      // Update each item received quantity
      for (const item of items) {
        const received = receiveState[item.id]
        if (received.quantity_received > 0) {
          await updatePurchaseOrderItem(item.id, {
            quantity_received: received.quantity_received,
            lot_number: received.lot_number,
            expiration_date: received.expiration_date,
          })

          // Update inventory stock if linked
          if (item.inventory_id) {
            await adjustInventoryStock(
              item.inventory_id,
              received.quantity_received,
              'Purchase order receipt'
            )
          }
        }
      }

      // Create supplier rating
      const ratingResult = await createSupplierRating(breweryId, {
        supplier_id: supplier.id,
        purchase_order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quality_rating: supplierRatings.quality as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delivery_rating: supplierRatings.delivery as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reliability_rating: supplierRatings.reliability as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pricing_rating: supplierRatings.pricing as any,
        would_order_again: supplierRatings.quality >= 3,
        comments: qualityIssues,
      })

      if (!ratingResult.success) {
        console.warn('Failed to create rating:', ratingResult.error)
      } else {
        // Recalculate supplier metrics after rating is created
        await recalculateSupplierMetrics(supplier.id)
      }

      onSuccess?.()
      router.push(`/purchase-orders/${order.id}`)
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to receive order' }
    }
  }

  // Calculate received vs ordered
  const totalOrdered = items.reduce((sum, item) => sum + item.quantity_ordered, 0)
  const totalReceived = Object.values(receiveState).reduce(
    (sum, state) => sum + (state.quantity_received || 0),
    0
  )

  // Calculate delivery days
  const daysToDeliver = order.expected_delivery_date
    ? Math.floor((new Date().getTime() - new Date(order.expected_delivery_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const isLate = daysToDeliver && daysToDeliver > 0

  return (
    <div className="max-w-4xl mx-auto">
      <FormWithToast
        action={handleSubmit}
        successMessage="Order received successfully"
      >
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/purchase-orders/${order.id}`}>
                <Button variant="ghost" size="icon">
                  <LucideArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Receive Order</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {order.order_number} from {supplier.name}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Status Alert */}
          {isLate ? (
            <div className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 flex gap-3">
              <LucideAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Order is {Math.abs(daysToDeliver)} days late</div>
                <div className="text-sm">Expected delivery was {order.expected_delivery_date}. Please rate the supplier&apos;s delivery performance.</div>
              </div>
            </div>
          ) : daysToDeliver === 0 ? (
            <div className="p-4 border border-green-300 rounded-lg bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 flex gap-3">
              <LucideCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Order delivered on time</div>
                <div className="text-sm">Delivery arrived today as expected.</div>
              </div>
            </div>
          ) : null}

          {/* Order Summary Section */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
            <h2 className="font-bold text-lg">Order Summary</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Order Date</div>
                <div className="font-bold">{new Date(order.order_date).toLocaleDateString()}</div>
              </div>
              
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Expected Delivery</div>
                <div className="font-bold">
                  {order.expected_delivery_date 
                    ? new Date(order.expected_delivery_date).toLocaleDateString()
                    : 'Not specified'}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Cost</div>
                <div className="font-bold">${order.total_cost?.toFixed(2) || '0.00'}</div>
              </div>

              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Invoice</div>
                <div className="font-bold font-mono">{order.invoice_number || '—'}</div>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg mb-4">Items Received</h2>

            <div className="space-y-3">
              {items.map((item) => {
                const received = receiveState[item.id]
                const isComplete = received.quantity_received >= item.quantity_ordered
                const isPartial = received.quantity_received > 0 && received.quantity_received < item.quantity_ordered
                const isNotReceived = received.quantity_received === 0

                return (
                  <div 
                    key={item.id} 
                    className={`p-3 border rounded ${
                      isComplete ? 'border-green-300 bg-green-50 dark:bg-green-950/30' :
                      isNotReceived ? 'border-red-300 bg-red-50 dark:bg-red-950/30' :
                      'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-bold">{item.item_name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Ordered: {item.quantity_ordered} {item.unit} @ ${item.unit_price.toFixed(2)}/{item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        {isComplete && <div className="text-xs font-bold text-green-600">✓ Complete</div>}
                        {isPartial && <div className="text-xs font-bold text-yellow-600">⚠ Partial</div>}
                        {isNotReceived && <div className="text-xs font-bold text-red-600">✗ Not Received</div>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Qty Received</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={received.quantity_received}
                          onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Unit</label>
                        <div className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-sm">
                          {item.unit}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Lot #</label>
                        <Input
                          value={received.lot_number || ''}
                          onChange={(e) => setReceiveState(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], lot_number: e.target.value }
                          }))}
                          placeholder="Optional"
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Expiration</label>
                        <Input
                          type="date"
                          value={received.expiration_date || ''}
                          onChange={(e) => setReceiveState(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], expiration_date: e.target.value }
                          }))}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-3 mt-3 flex justify-between text-sm">
              <span className="font-medium">Total Received:</span>
              <span className="font-bold font-mono">{totalReceived} / {totalOrdered} items</span>
            </div>
          </div>

          {/* Quality & Issues Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg">Quality & Issues</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Were there any issues with this delivery?
              </label>
              <textarea
                value={qualityIssues}
                onChange={(e) => setQualityIssues(e.target.value)}
                placeholder="e.g., Damaged packaging, wrong item, incorrect quantity, expired items..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Supplier Rating Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg mb-4">Rate This Supplier</h2>

            {/* Quality Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Quality Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSupplierRatings(prev => ({ ...prev, quality: star }))}
                    className={`text-3xl transition ${
                      star <= supplierRatings.quality
                        ? 'text-amber-400'
                        : 'text-slate-300 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input type="hidden" name="quality_rating" value={supplierRatings.quality} />
            </div>

            {/* Delivery Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Delivery Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSupplierRatings(prev => ({ ...prev, delivery: star }))}
                    className={`text-3xl transition ${
                      star <= supplierRatings.delivery
                        ? 'text-amber-400'
                        : 'text-slate-300 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input type="hidden" name="delivery_rating" value={supplierRatings.delivery} />
            </div>

            {/* Reliability Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Reliability Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSupplierRatings(prev => ({ ...prev, reliability: star }))}
                    className={`text-3xl transition ${
                      star <= supplierRatings.reliability
                        ? 'text-amber-400'
                        : 'text-slate-300 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input type="hidden" name="reliability_rating" value={supplierRatings.reliability} />
            </div>

            {/* Pricing Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Pricing Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSupplierRatings(prev => ({ ...prev, pricing: star }))}
                    className={`text-3xl transition ${
                      star <= supplierRatings.pricing
                        ? 'text-amber-400'
                        : 'text-slate-300 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input type="hidden" name="pricing_rating" value={supplierRatings.pricing} />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2">
            <SubmitButton className="gap-2">
              <LucideSave className="w-4 h-4" />
              Mark as Delivered & Rate
            </SubmitButton>

            <Link href={`/purchase-orders/${order.id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </FormWithToast>
    </div>
  )
}
