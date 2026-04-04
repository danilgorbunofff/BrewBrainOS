import { getSupplier, getSupplierPerformance, getPurchaseOrders } from '@/app/actions/supplier-actions'
import { requireActiveBrewery } from '@/lib/require-brewery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LucideEdit, LucidePhone, LucideMail, LucideMap, LucideGlobe, LucideArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function SupplierDetailPage({
  params
}: {
  params: { id: string }
}) {
  const { brewery } = await requireActiveBrewery()

  // Get supplier
  const supplierResult = await getSupplier(params.id)
  if (!supplierResult.success) {
    notFound()
  }

  const supplier = supplierResult.data

  // Verify ownership
  if (supplier.brewery_id !== brewery.id) {
    notFound()
  }

  // Get performance metrics
  const performanceResult = await getSupplierPerformance(params.id)
  const performance = performanceResult.success ? performanceResult.data : null

  // Get purchase orders count
  const ordersResult = await getPurchaseOrders(brewery.id)
  const supplierOrders = ordersResult.success 
    ? ordersResult.data.filter(o => o.supplier_id === supplier.id)
    : []

  const getSupplierTypeColor = (type: string) => {
    switch (type) {
      case 'Distributor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'Direct':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'Cooperative':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const renderStars = (rating: number) => {
    if (rating === 0) return <span className="text-slate-400">No ratings</span>
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-px">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-3xl ${
                i < Math.round(rating) 
                  ? 'text-amber-400' 
                  : 'text-slate-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-xl font-bold">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="icon">
              <LucideArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <div className="flex gap-2 mt-2">
              <Badge className={getSupplierTypeColor(supplier.supplier_type)}>
                {supplier.supplier_type}
              </Badge>
              {!supplier.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {supplier.specialty && (
                <Badge variant="outline">{supplier.specialty}</Badge>
              )}
            </div>
          </div>
        </div>
        <Link href={`/suppliers/${supplier.id}/edit`}>
          <Button className="gap-2">
            <LucideEdit className="w-4 h-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Contact Information</h2>
            
            {supplier.contact_person && (
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Contact Person</div>
                <div className="font-medium">{supplier.contact_person}</div>
              </div>
            )}

            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                <LucideMail className="w-4 h-4" />
                {supplier.email}
              </a>
            )}

            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                <LucidePhone className="w-4 h-4" />
                {supplier.phone}
              </a>
            )}

            {supplier.website && (
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                <LucideGlobe className="w-4 h-4" />
                {supplier.website}
              </a>
            )}

            {(supplier.city || supplier.state) && (
              <div className="flex items-start gap-2">
                <LucideMap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Location</div>
                  <div className="font-medium">
                    {supplier.city && supplier.state 
                      ? `${supplier.city}, ${supplier.state}`
                      : supplier.city || supplier.state}
                    {supplier.zip_code && ` ${supplier.zip_code}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Address */}
          {supplier.address && (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
              <h2 className="font-bold text-lg">Address</h2>
              <div className="space-y-1 text-sm">
                <div>{supplier.address}</div>
                {supplier.city && <div>{supplier.city}, {supplier.state} {supplier.zip_code}</div>}
                {supplier.country && supplier.country !== 'USA' && <div>{supplier.country}</div>}
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
              <h2 className="font-bold text-lg">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Performance */}
        <div className="space-y-6">
          {/* Quality Rating */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Quality Rating</h2>
            {renderStars(supplier.avg_quality_rating)}
          </div>

          {/* Statistics */}
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
            <h2 className="font-bold text-lg">Statistics</h2>
            
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Orders</div>
              <div className="text-3xl font-bold">{supplierOrders.length}</div>
            </div>

            {performance && (
              <>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">On-Time Delivery</div>
                  <div className="text-2xl font-bold">{performance.on_time_percentage.toFixed(0)}%</div>
                </div>

                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Avg Delivery Time</div>
                  <div className="text-2xl font-bold">{performance.avg_delivery_days.toFixed(1)} days</div>
                </div>

                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Quality Issues</div>
                  <div className="text-2xl font-bold">{performance.quality_issues_count}</div>
                </div>

                {performance.total_spent && (
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Total Spent</div>
                    <div className="text-2xl font-bold">${performance.total_spent.toFixed(2)}</div>
                  </div>
                )}
              </>
            )}

            {supplier.years_partnered && (
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Years Partnered</div>
                <div className="text-2xl font-bold">{supplier.years_partnered} years</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {supplierOrders.length > 0 && (
        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
          <h2 className="font-bold text-lg mb-4">Recent Orders ({supplierOrders.length})</h2>
          <div className="space-y-2 text-sm">
            {supplierOrders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-2 border rounded bg-white dark:bg-slate-800">
                <div>
                  <div className="font-medium">{order.order_number}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{order.order_date}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{order.status}</Badge>
                  {order.total_cost && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      ${order.total_cost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {supplierOrders.length > 5 && (
              <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
                +{supplierOrders.length - 5} more orders
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
