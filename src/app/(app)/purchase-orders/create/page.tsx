import { requireActiveBrewery } from '@/lib/require-brewery'
import { PurchaseOrderForm } from '@/components/PurchaseOrderForm'

export default async function CreatePurchaseOrderPage() {
  const { brewery } = await requireActiveBrewery()

  return (
    <div className="container py-8">
      <PurchaseOrderForm breweryId={brewery.id} />
    </div>
  )
}
