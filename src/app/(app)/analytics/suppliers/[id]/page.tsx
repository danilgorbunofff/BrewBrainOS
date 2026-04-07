import { requireActiveBrewery } from '@/lib/require-brewery'
import { getSupplier } from '@/app/actions/supplier-actions'
import { getSupplierTrends, getSupplierQualityIssues } from '@/app/actions/supplier-actions'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SupplierScorecard } from '@/components/SupplierScorecard'
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart'
import { QualityAnalysisPanel } from '@/components/QualityAnalysisPanel'
import Link from 'next/link'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LucideArrowLeft, LucideStar, LucidePackageCheck, LucideTrendingUp } from 'lucide-react'

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const { brewery } = await requireActiveBrewery()

  // Get supplier
  const supplierResult = await getSupplier(resolvedParams.id)
  if (!supplierResult.success || !supplierResult.data) {
    notFound()
  }

  const supplier = supplierResult.data

  // Verify brewery access
  if (supplier.brewery_id !== brewery.id) {
    notFound()
  }

  // Get trends
  const trendsResult = await getSupplierTrends(resolvedParams.id, 90)
  const trends = trendsResult.success ? trendsResult.data || [] : []

  // Get quality issues
  const qualityResult = await getSupplierQualityIssues(resolvedParams.id, brewery.id, 90)
  const qualityData = qualityResult.success ? qualityResult.data : null

  // Build analytics object
  const analytics = {
    avgQualityRating: supplier.avg_quality_rating || 0,
    avgDeliveryRating: 0, // Would come from aggregated ratings
    avgReliabilityRating: 0,
    avgPricingRating: 0,
    overallScore: supplier.avg_quality_rating || 0,
    onTimeDeliveryPercent: 0,
    avgDeliveryDays: supplier.avg_delivery_days || 0,
    qualityIssuePercent: qualityData?.issuePercent || 0,
    wouldOrderAgainPercent: 0,
    totalOrdersReviewed: supplier.total_orders || 0,
    totalSpent: 0,
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon">
            <LucideArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">{supplier.supplier_type}</p>
        </div>
      </div>

      {/* Main Content: Scorecard + Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scorecard (Sidebar) */}
        <div className="lg:col-span-1">
          <SupplierScorecard
            supplierId={supplier.id}
            supplierName={supplier.name}
            supplierType={supplier.supplier_type}
            analytics={analytics}
          />
        </div>

        {/* Quality Analysis (Main) */}
        <div className="lg:col-span-2">
          {qualityData ? (
            <QualityAnalysisPanel
              data={qualityData}
              supplierName={supplier.name}
            />
          ) : (
            <div className="h-96 border rounded-lg flex items-center justify-center text-slate-500">
              No quality data available
            </div>
          )}
        </div>
      </div>

      {/* Performance Trends */}
      {trends && trends.length > 0 && (
        <PerformanceTrendChart
          data={trends}
          supplierName={supplier.name}
          daysBack={90}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onDaysChange={(days) => {
            // Could refetch with new days
          }}
        />
      )}

      {/* Supplier Contact Card */}
      {(supplier.email ||
        supplier.phone ||
        supplier.contact_person ||
        supplier.website) && (
        <div className="p-6 border rounded-lg space-y-3">
          <h3 className="font-bold text-lg">Contact Information</h3>
          {supplier.contact_person && (
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Contact Person</div>
              <div className="font-medium">{supplier.contact_person}</div>
            </div>
          )}
          {supplier.email && (
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Email</div>
              <a href={`mailto:${supplier.email}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.phone && (
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Phone</div>
              <a href={`tel:${supplier.phone}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {supplier.phone}
              </a>
            </div>
          )}
          {supplier.website && (
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Website</div>
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {supplier.website}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/suppliers/${supplier.id}`}>
          <Button variant="outline" className="gap-2">
            <LucidePackageCheck className="w-4 h-4" />
            View Supplier Profile
          </Button>
        </Link>
        <Link href="/purchase-orders/create">
          <Button className="gap-2">
            <LucideTrendingUp className="w-4 h-4" />
            Place New Order
          </Button>
        </Link>
      </div>
    </div>
  )
}
