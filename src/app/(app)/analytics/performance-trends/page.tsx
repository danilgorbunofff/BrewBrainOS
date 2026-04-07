import { requireActiveBrewery } from '@/lib/require-brewery'
import { getSupplierAnalytics, getSupplierTrends } from '@/app/actions/supplier-actions'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart'
import Link from 'next/link'
import { LucideArrowLeft } from 'lucide-react'

export default async function PerformanceTrendsPage() {
  const { brewery } = await requireActiveBrewery()

  // Get all suppliers
  const analyticsResult = await getSupplierAnalytics(brewery.id, 90)
  if (!analyticsResult.success) {
    notFound()
  }

  const suppliers = analyticsResult.data || []

  if (suppliers.length === 0) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Link href="/analytics">
            <Button variant="ghost" size="sm" className="gap-2">
              <LucideArrowLeft className="w-4 h-4" />
              Back to Analytics
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold">Performance Trends</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track supplier performance over time
            </p>
          </div>

          <div className="p-8 border-2 border-dashed rounded-lg text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No suppliers with ratings yet
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Build trend charts for each supplier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplierTrends: Record<string, any[]> = {}

  for (const supplier of suppliers) {
    const trendsResult = await getSupplierTrends(supplier.supplierId, 90)
    if (trendsResult.success && trendsResult.data) {
      supplierTrends[supplier.supplierId] = trendsResult.data
    }
  }

  // Sort by overall score descending
  const sortedSuppliers = [...suppliers].sort(
    (a, b) => b.overallScore - a.overallScore
  )

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/analytics">
          <Button variant="ghost" size="sm" className="gap-2">
            <LucideArrowLeft className="w-4 h-4" />
            Back to Overview
          </Button>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold">Performance Trends</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track how supplier performance changes over time
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>{suppliers.length} suppliers</strong> tracked over 90 days. 
          Look for trends and patterns to identify suppliers with improving or declining performance.
        </p>
      </div>

      {/* Trend Charts by Supplier */}
      <div className="space-y-8">
        {sortedSuppliers.map((supplier) => (
          <div key={supplier.supplierId}>
            <PerformanceTrendChart
              data={supplierTrends[supplier.supplierId] || []}
              supplierName={supplier.supplierName}
              daysBack={90}
            />
          </div>
        ))}
      </div>

      {/* Insights Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Insights</h2>
        
        {/* Improving Suppliers */}
        {suppliers.filter(s => (s.avgQualityRating || 0) >= 4).length > 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
              ⭐ Top Performers
            </h3>
            <div className="text-sm text-green-800 dark:text-green-200">
              {suppliers
                .filter(s => (s.avgQualityRating || 0) >= 4)
                .map(s => s.supplierName)
                .join(', ')} consistently deliver quality service.
            </div>
          </div>
        )}

        {/* At-Risk Suppliers */}
        {suppliers.filter(s => (s.qualityIssuePercent || 0) > 30).length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Needs Attention
            </h3>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              {suppliers
                .filter(s => (s.qualityIssuePercent || 0) > 30)
                .map(s => `${s.supplierName} (${s.qualityIssuePercent}% issues)`)
                .join(', ')} have elevated issue rates. Consider follow-up.
            </div>
          </div>
        )}

        {/* Reliability Insights */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-lg">
          <h3 className="font-medium mb-2">Delivery Reliability</h3>
          <div className="space-y-2 text-sm">
            {sortedSuppliers
              .sort((a, b) => (b.onTimeDeliveryPercent || 0) - (a.onTimeDeliveryPercent || 0))
              .slice(0, 3)
              .map((supplier, idx) => (
                <div key={supplier.supplierId} className="flex justify-between">
                  <span>
                    {idx + 1}. {supplier.supplierName}
                  </span>
                  <span className="font-medium">{supplier.onTimeDeliveryPercent || 0}% on-time</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
