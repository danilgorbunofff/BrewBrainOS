import { getSupplier } from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { SupplierForm } from '@/components/SupplierForm'
import { notFound } from 'next/navigation'

export default async function EditSupplierPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const { brewery } = await requireActiveBrewery()

  const result = await getSupplier(resolvedParams.id)
  if (!result.success) {
    notFound()
  }

  const supplier = result.data

  // Verify ownership
  if (supplier.brewery_id !== brewery.id) {
    notFound()
  }

  return (
    <div className="container py-8">
      <SupplierForm breweryId={brewery.id} supplier={supplier} />
    </div>
  )
}
