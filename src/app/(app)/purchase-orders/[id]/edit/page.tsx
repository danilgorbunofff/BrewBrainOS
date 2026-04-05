import {
  getPurchaseOrder,
  getPurchaseOrderItems,
  getSuppliers
} from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { PurchaseOrderForm } from '@/components/PurchaseOrderForm'
import { notFound } from 'next/navigation'

export default async function EditOrderPage({
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

  // Only allow editing if order is pending
  if (order.status !== 'pending') {
    notFound()
  }

  // Get order items
  const itemsResult = await getPurchaseOrderItems(order.id)
  if (!itemsResult.success) {
    notFound()
  }

  // Get suppliers for selector
  const suppliersResult = await getSuppliers(brewery.id)
  if (!suppliersResult.success) {
    notFound()
  }

  return (
    <div className="container py-8">
      <PurchaseOrderForm
        breweryId={brewery.id}
        initialOrder={order}
        initialItems={itemsResult.data}
        suppliers={suppliersResult.data}
      />
    </div>
  )
}
