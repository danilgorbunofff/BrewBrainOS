import { 
  getPurchaseOrder, 
  getPurchaseOrderItems,
  getSupplier
} from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LucideArrowLeft, LucideEdit, LucideDownload, LucideRefreshCw, LucideCheckCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PurchaseOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const { brewery } = await requireActiveBrewery()

  // Get purchase order
  const orderResult = await getPurchaseOrder(resolvedParams.id)
  if (!orderResult.success) {
    notFound()
  }

  const order = orderResult.data

  // Verify ownership
  if (order.brewery_id !== brewery.id) {
    notFound()
  }

  // Get order items
  const itemsResult = await getPurchaseOrderItems(order.id)
  const items = itemsResult.success ? itemsResult.data : []

  // Get supplier
  const supplierResult = await getSupplier(order.supplier_id)
  const supplier = supplierResult.success ? supplierResult.data : null

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'unpaid':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'partial':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'paid':
        return 'bg-green-50 text-green-700 border border-green-200'
      default:
        return 'bg-slate-50 text-slate-700'
    }
  }

  const totalQuantityOrdered = items.reduce((sum, item) => sum + item.quantity_ordered, 0)
  const totalQuantityReceived = items.reduce((sum, item) => sum + (item.quantity_received || 0), 0)

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="icon">
              <LucideArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-mono">{order.order_number}</h1>
            {supplier && (
              <Link 
                href={`/suppliers/${supplier.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {supplier.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Link href={`/purchase-orders/${order.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <LucideEdit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          )}
          {order.status !== 'delivered' && order.status !== 'canceled' && (
            <Link href={`/purchase-orders/${order.id}/receive`}>
              <Button size="sm" className="gap-2">
                <LucideCheckCircle className="w-4 h-4" />
                Receive Items
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Section */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Status</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Order Status</div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Payment Status</div>
                <Badge className={getPaymentColor(order.payment_status)}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </Badge>
              </div>

              {order.any_issues && (
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Issues</div>
                  <Badge variant="destructive">⚠️ Problems Found</Badge>
                </div>
              )}
            </div>

            {order.issue_description && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm">
                <div className="font-medium text-red-900 dark:text-red-100">Issues Reported:</div>
                <div className="text-red-800 dark:text-red-200 whitespace-pre-wrap">{order.issue_description}</div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Timeline</h2>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Order Date</div>
                <div className="font-bold text-lg">{new Date(order.order_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>

              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Expected Delivery</div>
                <div className="font-bold text-lg">
                  {order.expected_delivery_date 
                    ? new Date(order.expected_delivery_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Not specified'}
                </div>
              </div>

              {order.actual_delivery_date && (
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Actual Delivery</div>
                  <div className="font-bold text-lg text-green-600 dark:text-green-400">
                    {new Date(order.actual_delivery_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Items</h2>

            <div className="space-y-3">
              {items.map((item) => {
                const isComplete = item.quantity_received >= item.quantity_ordered
                const isPartial = item.quantity_received > 0 && item.quantity_received < item.quantity_ordered
                const isNotReceived = !item.quantity_received || item.quantity_received === 0

                return (
                  <div 
                    key={item.id}
                    className={`p-3 border rounded text-sm ${
                      isComplete ? 'border-green-300 bg-green-50 dark:bg-green-950/30' :
                      isNotReceived ? 'border-slate-300 bg-white dark:bg-slate-800' :
                      'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold">{item.item_name}</div>
                        {item.lot_number && (
                          <div className="text-xs text-slate-600 dark:text-slate-400">Lot: {item.lot_number}</div>
                        )}
                        {item.expiration_date && (
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Expires: {new Date(item.expiration_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isComplete && <span className="text-xs font-bold text-green-600">✓ Complete</span>}
                        {isPartial && <span className="text-xs font-bold text-yellow-600">⚠ Partial</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Ordered</div>
                        <div className="font-mono font-bold">{item.quantity_ordered} {item.unit}</div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Unit Price</div>
                        <div className="font-mono font-bold">${item.unit_price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Total</div>
                        <div className="font-mono font-bold">
                          ${(item.quantity_ordered * item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {(item.quantity_received || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs font-bold text-green-600">
                          Received: {item.quantity_received} {item.unit}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          {supplier && (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
              <h2 className="font-bold text-lg">Supplier</h2>
              
              <Link 
                href={`/suppliers/${supplier.id}`}
                className="block text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {supplier.name}
              </Link>

              {supplier.contact_person && (
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Contact</div>
                  <div className="text-sm">{supplier.contact_person}</div>
                </div>
              )}

              {supplier.email && (
                <a 
                  href={`mailto:${supplier.email}`}
                  className="block text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {supplier.email}
                </a>
              )}

              {supplier.phone && (
                <a 
                  href={`tel:${supplier.phone}`}
                  className="block text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {supplier.phone}
                </a>
              )}
            </div>
          )}

          {/* Financial Summary */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
            <h2 className="font-bold text-lg">Financial</h2>

            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Amount</div>
              <div className="text-2xl font-bold font-mono">
                ${order.total_cost?.toFixed(2) || '0.00'}
              </div>
            </div>

            {order.invoice_number && (
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Invoice #</div>
                <div className="font-mono font-bold text-sm">{order.invoice_number}</div>
              </div>
            )}
          </div>

          {/* Fulfillment Summary */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
            <h2 className="font-bold text-lg">Fulfillment</h2>

            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Items</div>
              <div className="text-2xl font-bold">
                {totalQuantityReceived} / {totalQuantityOrdered}
              </div>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${(totalQuantityReceived / totalQuantityOrdered) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quality Rating */}
          {order.quality_rating && (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
              <h2 className="font-bold text-lg">Quality Rating</h2>
              
              <div className="flex gap-px">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-3xl ${
                      i < Math.round(order.quality_rating!) 
                        ? 'text-amber-400' 
                        : 'text-slate-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              
              <div className="text-2xl font-bold">{order.quality_rating.toFixed(1)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
