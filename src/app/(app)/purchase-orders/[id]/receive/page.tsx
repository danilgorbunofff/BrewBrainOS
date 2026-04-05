import { 
  getPurchaseOrder,
  getPurchaseOrderItems,
  getSupplier
} from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { ReceiveOrderForm } from '@/components/ReceiveOrderForm'
import { notFound } from 'next/navigation'

export default async function ReceiveOrderPage({
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
  if (!itemsResult.success) {
    notFound()
  }

  // Get supplier
  const supplierResult = await getSupplier(order.supplier_id)
  if (!supplierResult.success) {
    notFound()
  }

  return (
    <div className="container py-8">
      <ReceiveOrderForm
        breweryId={brewery.id}
        order={order}
        items={itemsResult.data}
        supplier={supplierResult.data}
      />
    </div>
  )
}
