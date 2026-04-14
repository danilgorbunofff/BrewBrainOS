'use client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ActionResult, PurchaseOrder, Supplier, PurchaseOrderItem } from '@/types/database'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createPurchaseOrder, updatePurchaseOrder, getSuppliers } from '@/app/actions/supplier-actions'
import { SupplierSelector } from '@/components/SupplierSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucideArrowLeft, LucideSave, LucidePlus, LucideTrash2 } from 'lucide-react'
import Link from 'next/link'

interface PurchaseOrderFormProps {
  breweryId: string
  initialOrder?: PurchaseOrder
  initialItems?: PurchaseOrderItem[]
  suppliers?: Supplier[]
  onSuccess?: () => void
}

interface LineItem {
  id: string
  item_name: string
  quantity_ordered: number
  unit: string
  unit_price: number
  lot_number?: string
  expiration_date?: string
}

export function PurchaseOrderForm({ 
  breweryId, 
  initialOrder, 
  initialItems,
  suppliers: suppliersList,
  onSuccess 
}: PurchaseOrderFormProps) {
  const router = useRouter()
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEditing = !!initialOrder

  // Initialize form with existing data when editing
  useEffect(() => {
    if (isEditing && initialOrder && initialItems) {
      // Initialize line items
      const items: LineItem[] = initialItems.map(item => ({
        id: item.id,
        item_name: item.item_name,
        quantity_ordered: item.quantity_ordered,
        unit: item.unit,
        unit_price: item.unit_price,
        lot_number: item.lot_number || undefined,
        expiration_date: item.expiration_date || undefined,
      }))
      setLineItems(items)

      // Find and set the supplier
      if (suppliersList) {
        const supplier = suppliersList.find(s => s.id === initialOrder.supplier_id)
        if (supplier) {
          setSelectedSupplier(supplier)
        }
      }
    }
  }, [isEditing, initialOrder, initialItems, suppliersList])

  // Handle form submission
  const handleSubmit = async (formData: FormData): Promise<ActionResult> => {
    try {
      setErrors({})

      const orderNumber = formData.get('order_number') as string
      const supplierId = formData.get('supplier_id') as string
      const orderDate = formData.get('order_date') as string
      const expectedDeliveryDate = formData.get('expected_delivery_date') as string
      const totalCost = formData.get('total_cost') as string
      const invoiceNumber = formData.get('invoice_number') as string

      // Validation
      const newErrors: Record<string, string> = {}
      if (!orderNumber?.trim()) newErrors.order_number = 'Order number is required'
      if (!supplierId) newErrors.supplier_id = 'Supplier is required'
      if (!orderDate) newErrors.order_date = 'Order date is required'
      if (lineItems.length === 0) newErrors.line_items = 'At least one line item is required'

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return { success: false, error: 'Please fix the errors below' }
      }

      // Calculate total if not provided
      const calculatedTotal = lineItems.reduce(
        (sum, item) => sum + (item.quantity_ordered * item.unit_price),
        0
      )

      const orderData = {
        order_number: orderNumber.trim(),
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        total_cost: totalCost ? parseFloat(totalCost) : calculatedTotal,
        invoice_number: invoiceNumber?.trim() || null,
        status: isEditing ? initialOrder?.status : ('pending' as const),
        payment_status: isEditing ? initialOrder?.payment_status : ('unpaid' as const),
        items_summary: lineItems,
        any_issues: false,
      }

      let result

      if (isEditing && initialOrder) {
        result = await updatePurchaseOrder(initialOrder.id, orderData)
      } else {
        result = await createPurchaseOrder(breweryId, selectedSupplier!.id, orderData)
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      onSuccess?.()
      router.push('/purchase-orders')
      return result
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save purchase order' }
    }
  }

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        item_name: '',
        quantity_ordered: 1,
        unit: 'kg',
        unit_price: 0,
      }
    ])
  }

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Update line item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Calculate line total
  const calculateLineTotal = (quantity: number, price: number) => {
    return (quantity * price).toFixed(2)
  }

  // Calculate grand total
  const grandTotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity_ordered * item.unit_price),
    0
  ).toFixed(2)

  return (
    <div className="max-w-4xl mx-auto">
      <FormWithToast
        action={handleSubmit}
        successMessage={isEditing ? 'Order updated successfully' : 'Order created successfully'}
      >
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/purchase-orders">
                <Button variant="ghost" size="icon">
                  <LucideArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h1>
            </div>
          </div>

          {/* Order Information Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-surface">
            <h2 className="font-bold text-lg">Order Information</h2>

            {/* Order Number & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Order Number *
                </label>
                <Input
                  name="order_number"
                  placeholder="e.g., PO-001"
                  defaultValue={initialOrder?.order_number || ''}
                  className={errors.order_number ? 'border-red-500' : ''}
                />
                {errors.order_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.order_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Order Date *
                </label>
                <Input
                  name="order_date"
                  type="date"
                  defaultValue={initialOrder?.order_date || ''}
                  className={errors.order_date ? 'border-red-500' : ''}
                />
                {errors.order_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.order_date}</p>
                )}
              </div>
            </div>

            {/* Expected Delivery & Invoice Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expected Delivery Date
                </label>
                <Input
                  name="expected_delivery_date"
                  type="date"
                  defaultValue={initialOrder?.expected_delivery_date || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Number
                </label>
                <Input
                  name="invoice_number"
                  placeholder="e.g., INV-12345"
                  defaultValue={initialOrder?.invoice_number || ''}
                />
              </div>
            </div>
          </div>

          {/* Supplier Selection Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-surface">
            <h2 className="font-bold text-lg">Supplier *</h2>
            
            <SupplierSelector
              breweryId={breweryId}
              onSelect={setSelectedSupplier}
              label=""
              placeholder="Select a supplier"
            />

            {errors.supplier_id && (
              <p className="text-red-500 text-sm">{errors.supplier_id}</p>
            )}

            <input
              type="hidden"
              name="supplier_id"
              value={selectedSupplier?.id || ''}
            />
          </div>

          {/* Line Items Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-surface">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Line Items *</h2>
              <Button
                type="button"
                onClick={addLineItem}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LucidePlus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {errors.line_items && (
              <p className="text-red-500 text-sm mb-4">{errors.line_items}</p>
            )}

            {lineItems.length === 0 ? (
              <div className="p-4 border dashed rounded text-center text-muted-foreground">
                No items added. Click &quot;Add Item&quot; to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-3 border rounded bg-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
                      >
                        <LucideTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Item Name</label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateLineItem(item.id, 'item_name', e.target.value)}
                          placeholder="e.g., Citra Hops"
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border rounded bg-card border-border text-sm"
                        >
                          <option>kg</option>
                          <option>lb</option>
                          <option>oz</option>
                          <option>ea</option>
                          <option>bbl</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Quantity</label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantity_ordered}
                          onChange={(e) => updateLineItem(item.id, 'quantity_ordered', parseFloat(e.target.value))}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Unit Price</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value))}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Line Total</label>
                        <div className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          ${calculateLineTotal(item.quantity_ordered, item.unit_price)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Lot #</label>
                        <Input
                          value={item.lot_number || ''}
                          onChange={(e) => updateLineItem(item.id, 'lot_number', e.target.value)}
                          placeholder="Optional"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Expiration Date</label>
                      <Input
                        type="date"
                        value={item.expiration_date || ''}
                        onChange={(e) => updateLineItem(item.id, 'expiration_date', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Section */}
          {lineItems.length > 0 && (
            <div className="p-4 border rounded-lg bg-surface">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-mono">${grandTotal}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <input
                      type="hidden"
                      name="total_cost"
                      value={grandTotal}
                    />
                    <span className="font-mono">${grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2">
            <SubmitButton className="gap-2">
              <LucideSave className="w-4 h-4" />
              {isEditing ? 'Update Order' : 'Create Order'}
            </SubmitButton>

            <Link href="/purchase-orders">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </FormWithToast>
    </div>
  )
}
