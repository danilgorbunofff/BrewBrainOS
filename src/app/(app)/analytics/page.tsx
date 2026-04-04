import { requireActiveBrewery } from '@/lib/require-brewery'
import { getSupplierAnalytics } from '@/app/actions/supplier-actions'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SupplierScorecard } from '@/components/SupplierScorecard'
import { SupplierComparisonTable } from '@/components/SupplierComparisonTable'
import Link from 'next/link'
import { LucideArrowRight, LucideBarChart3, LucideFilter } from 'lucide-react'

export default async function AnalyticsSuppliersPage() {
  const { brewery } = await requireActiveBrewery()

  // Get analytics for 90-day period
  const analyticsResult = await getSupplierAnalytics(brewery.id, 90)

  if (!analyticsResult.success) {
    notFound()
  }

  const analytics = analyticsResult.data || []

  if (analytics.length === 0) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Supplier Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Analyze supplier performance and trends
            </p>
          </div>

          <div className="p-8 border-2 border-dashed rounded-lg text-center">
            <LucideBarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <h2 className="text-lg font-medium mb-2">No suppliers yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create suppliers and place orders to see analytics
            </p>
            <Link href="/suppliers/create">
              <Button>Create Supplier</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate summary statistics
  const avgOverallScore =
    analytics.reduce((sum, a) => sum + a.overallScore, 0) / analytics.length
  const avgQuality =
    analytics.reduce((sum, a) => sum + a.avgQualityRating, 0) / analytics.length
  const avgDelivery =
    analytics.reduce((sum, a) => sum + a.onTimeDeliveryPercent, 0) / analytics.length
  const totalSpent = analytics.reduce((sum, a) => sum + a.totalSpent, 0)

  // Sort by overall score descending
  const sortedAnalytics = [...analytics].sort(
    (a, b) => b.overallScore - a.overallScore
  )

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Supplier Analytics</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Performance insights for {analytics.length} supplier{analytics.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Overall Score
          </div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {avgOverallScore.toFixed(2)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">/ 5.0</div>
        </div>

        <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
            Avg Quality
          </div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-300">
            {avgQuality.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">/ 5.0</div>
        </div>

        <div className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            On-Time Delivery
          </div>
          <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
            {avgDelivery.toFixed(0)}%
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Average</div>
        </div>

        <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <div className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
            Total Spent
          </div>
          <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
            ${(totalSpent / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">90 days</div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/analytics/suppliers">
          <Button size="sm" variant="default">
            Overview
          </Button>
        </Link>
        <Link href="/analytics/performance-trends">
          <Button size="sm" variant="outline">
            Trends
          </Button>
        </Link>
        <Link href="/analytics/quality-issues">
          <Button size="sm" variant="outline">
            Quality
          </Button>
        </Link>
        <Link href="/analytics/delivery-performance">
          <Button size="sm" variant="outline">
            Delivery
          </Button>
        </Link>
      </div>

      {/* Comparison Table */}
      <SupplierComparisonTable
        suppliers={sortedAnalytics}
        onSelectSupplier={(id) => {
          // Could add drill-down here
        }}
        sortBy="overall"
      />

      {/* Scorecards Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Supplier Scorecards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAnalytics.map((analytics) => (
            <Link
              key={analytics.supplierId}
              href={`/analytics/suppliers/${analytics.supplierId}`}
            >
              <SupplierScorecard
                supplierId={analytics.supplierId}
                supplierName={analytics.supplierName}
                supplierType={analytics.supplierType}
                analytics={{
                  avgQualityRating: analytics.avgQualityRating,
                  avgDeliveryRating: analytics.avgDeliveryRating,
                  avgReliabilityRating: analytics.avgReliabilityRating,
                  avgPricingRating: analytics.avgPricingRating,
                  overallScore: analytics.overallScore,
                  onTimeDeliveryPercent: analytics.onTimeDeliveryPercent,
                  avgDeliveryDays: analytics.avgDeliveryDays || 0,
                  qualityIssuePercent: analytics.qualityIssuePercent || 0,
                  wouldOrderAgainPercent: analytics.wouldOrderAgainPercent || 0,
                  totalOrdersReviewed: analytics.totalOrders,
                  totalSpent: analytics.totalSpent,
                }}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Call to actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <div>
          <h3 className="font-medium mb-2">Ready to order?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Use performance data to make smarter purchasing decisions
          </p>
          <Link href="/purchase-orders/create">
            <Button size="sm" className="gap-2">
              Create Purchase Order
              <LucideArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div>
          <h3 className="font-medium mb-2">View detailed trends</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            See performance trends over time for each supplier
          </p>
          <Link href="/analytics/performance-trends">
            <Button size="sm" variant="outline" className="gap-2">
              View Trends
              <LucideArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
