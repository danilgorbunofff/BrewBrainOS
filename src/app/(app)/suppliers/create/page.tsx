import { requireActiveBrewery } from '@/lib/require-brewery'
import { SupplierForm } from '@/components/SupplierForm'

export default async function CreateSupplierPage() {
  const { brewery } = await requireActiveBrewery()

  return (
    <div className="container py-8">
      <SupplierForm breweryId={brewery.id} />
    </div>
  )
}
