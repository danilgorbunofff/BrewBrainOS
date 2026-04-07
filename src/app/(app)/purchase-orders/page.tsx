import { getPurchaseOrders, getSuppliers } from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { PurchaseOrdersTable } from '@/components/PurchaseOrdersTable'
import { Button } from '@/components/ui/button'
import { LucidePlus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Purchase Orders — BrewBrain OS',
  description: 'Track ingredient orders and supplier deliveries.',
}

export default async function PurchaseOrdersPage() {
  const { brewery } = await requireActiveBrewery()

  const ordersResult = await getPurchaseOrders(brewery.id)
  const suppliersResult = await getSuppliers(brewery.id)

  if (!ordersResult.success) {
    return (
      <div className="container py-8">
        <p className="text-red-600 dark:text-red-400">
          Failed to load purchase orders: {ordersResult.error}
        </p>
      </div>
    )
  }

  // Enrich orders with supplier data
  const suppliersMap = suppliersResult.success 
    ? Object.fromEntries(suppliersResult.data.map(s => [s.id, s]))
    : {}

  const enrichedOrders = ordersResult.data.map(order => ({
    ...order,
    supplier: suppliersMap[order.supplier_id]
  }))

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track ingredient orders and supplier deliveries
          </p>
        </div>
        <Link href="/purchase-orders/create">
          <Button className="gap-2">
            <LucidePlus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {enrichedOrders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Orders</div>
            <div className="text-2xl font-bold">{enrichedOrders.length}</div>
          </div>

          <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">Pending</div>
            <div className="text-2xl font-bold">{enrichedOrders.filter(o => o.status === 'pending').length}</div>
          </div>

          <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">Delivered</div>
            <div className="text-2xl font-bold">{enrichedOrders.filter(o => o.status === 'delivered').length}</div>
          </div>

          <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Spend</div>
            <div className="text-2xl font-bold">
              ${enrichedOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders Table */}
      <PurchaseOrdersTable orders={enrichedOrders} />
    </div>
  )
}
