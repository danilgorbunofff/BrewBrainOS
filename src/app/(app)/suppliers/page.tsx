import { getSuppliers } from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { SuppliersTable } from '@/components/SuppliersTable'
import { Button } from '@/components/ui/button'
import { LucidePlus } from 'lucide-react'
import Link from 'next/link'

export default async function SuppliersPage() {
  const { brewery } = await requireActiveBrewery()

  const result = await getSuppliers(brewery.id)
  if (!result.success) {
    return (
      <div className="container py-8">
        <p className="text-red-600 dark:text-red-400">
          Failed to load suppliers: {result.error}
        </p>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage ingredients suppliers and track their performance
          </p>
        </div>
        <Link href="/suppliers/create">
          <Button className="gap-2">
            <LucidePlus className="w-4 h-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      {/* Suppliers Table */}
      <SuppliersTable 
        breweryId={brewery.id}
        suppliers={result.data}
      />
    </div>
  )
}
