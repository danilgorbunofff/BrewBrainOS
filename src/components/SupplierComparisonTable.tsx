'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/components/ui/button'
import { LucideArrowUp, LucideArrowDown, LucideMinus } from 'lucide-react'

interface AnalyticsData {
  supplierId: string
  supplierName: string
  supplierType: string
  overallScore: number
  avgQualityRating: number
  avgDeliveryRating: number
  avgReliabilityRating: number
  avgPricingRating: number
  onTimeDeliveryPercent: number
  totalOrders: number
  totalSpent: number
  qualityIssuePercent: number
}

interface SupplierComparisonTableProps {
  suppliers: AnalyticsData[]
  onSelectSupplier?: (supplierId: string) => void
  sortBy?: 'overall' | 'quality' | 'delivery' | 'reliability' | 'pricing'
  onSortChange?: (sortBy: string) => void
}

function getRatingColor(rating: number) {
  if (rating >= 4) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
  if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
}

function getPercentColor(percent: number) {
  if (percent >= 80) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
  if (percent >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
}

function getRank(value: number, allValues: number[]) {
  const sorted = [...allValues].sort((a, b) => b - a)
  const rank = sorted.indexOf(value) + 1
  if (rank === 1) return <LucideArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
  if (rank === sorted.length) return <LucideArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
  return <LucideMinus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
}

export function SupplierComparisonTable({
  suppliers,
  onSelectSupplier,
  sortBy = 'overall',
  onSortChange,
}: SupplierComparisonTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  if (!suppliers || suppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Comparison</CardTitle>
          <CardDescription>Compare suppliers across multiple dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">No suppliers to compare</div>
        </CardContent>
      </Card>
    )
  }

  // Sort suppliers
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    switch (sortBy) {
      case 'overall':
        return b.overallScore - a.overallScore
      case 'quality':
        return b.avgQualityRating - a.avgQualityRating
      case 'delivery':
        return b.avgDeliveryRating - a.avgDeliveryRating
      case 'reliability':
        return b.avgReliabilityRating - a.avgReliabilityRating
      case 'pricing':
        return b.avgPricingRating - a.avgPricingRating
      default:
        return 0
    }
  })

  // Get ranges for ranking
  const overallScores = suppliers.map((s) => s.overallScore)
  const qualityScores = suppliers.map((s) => s.avgQualityRating)
  const deliveryScores = suppliers.map((s) => s.avgDeliveryRating)
  const reliabilityScores = suppliers.map((s) => s.avgReliabilityRating)
  const pricingScores = suppliers.map((s) => s.avgPricingRating)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Comparison</CardTitle>
        <CardDescription>
          Compare {suppliers.length} suppliers across all performance dimensions
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold">Supplier</th>
                <th className="text-center py-2 px-2 font-semibold">
                  <button
                    onClick={() => onSortChange?.('overall')}
                    className="hover:underline"
                  >
                    Overall {sortBy === 'overall' && '↓'}
                  </button>
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  <button
                    onClick={() => onSortChange?.('quality')}
                    className="hover:underline"
                  >
                    Quality {sortBy === 'quality' && '↓'}
                  </button>
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  <button
                    onClick={() => onSortChange?.('delivery')}
                    className="hover:underline"
                  >
                    Delivery {sortBy === 'delivery' && '↓'}
                  </button>
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  <button
                    onClick={() => onSortChange?.('reliability')}
                    className="hover:underline"
                  >
                    Reliability {sortBy === 'reliability' && '↓'}
                  </button>
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  <button
                    onClick={() => onSortChange?.('pricing')}
                    className="hover:underline"
                  >
                    Pricing {sortBy === 'pricing' && '↓'}
                  </button>
                </th>
                <th className="text-center py-2 px-2 font-semibold">On-Time %</th>
                <th className="text-center py-2 px-2 font-semibold">Orders</th>
                <th className="text-right py-2 px-3 font-semibold">Total Spent</th>
              </tr>
            </thead>

            <tbody>
              {sortedSuppliers.map((supplier) => (
                <tr
                  key={supplier.supplierId}
                  className={`border-b border-border hover:bg-surface cursor-pointer transition-colors ${
                    selectedIds.has(supplier.supplierId)
                      ? 'bg-primary/5'
                      : ''
                  }`}
                  onClick={() => {
                    if (selectedIds.has(supplier.supplierId)) {
                      selectedIds.delete(supplier.supplierId)
                    } else {
                      selectedIds.add(supplier.supplierId)
                    }
                    setSelectedIds(new Set(selectedIds))
                    onSelectSupplier?.(supplier.supplierId)
                  }}
                >
                  <td className="py-3 px-3">
                    <div>
                      <div className="font-medium">{supplier.supplierName}</div>
                      <div className="text-xs text-muted-foreground">
                        {supplier.supplierType}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`px-2 py-1 rounded font-semibold ${getRatingColor(
                          supplier.overallScore
                        )}`}
                      >
                        {supplier.overallScore.toFixed(1)}
                      </span>
                      {getRank(supplier.overallScore, overallScores)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${getRatingColor(
                          supplier.avgQualityRating
                        )}`}
                      >
                        {supplier.avgQualityRating.toFixed(1)}
                      </span>
                      {getRank(supplier.avgQualityRating, qualityScores)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${getRatingColor(
                          supplier.avgDeliveryRating
                        )}`}
                      >
                        {supplier.avgDeliveryRating.toFixed(1)}
                      </span>
                      {getRank(supplier.avgDeliveryRating, deliveryScores)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${getRatingColor(
                          supplier.avgReliabilityRating
                        )}`}
                      >
                        {supplier.avgReliabilityRating.toFixed(1)}
                      </span>
                      {getRank(supplier.avgReliabilityRating, reliabilityScores)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${getRatingColor(
                          supplier.avgPricingRating
                        )}`}
                      >
                        {supplier.avgPricingRating.toFixed(1)}
                      </span>
                      {getRank(supplier.avgPricingRating, pricingScores)}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <span
                      className={`px-2 py-1 rounded font-semibold text-xs ${getPercentColor(
                        supplier.onTimeDeliveryPercent
                      )}`}
                    >
                      {supplier.onTimeDeliveryPercent}%
                    </span>
                  </td>

                  <td className="py-3 px-2 text-center font-medium">
                    {supplier.totalOrders}
                  </td>

                  <td className="py-3 px-3 text-right font-medium">
                    ${supplier.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden divide-y divide-border">
          {sortedSuppliers.map((supplier) => (
            <button
              key={supplier.supplierId}
              type="button"
              className={`w-full text-left px-4 py-3 space-y-2 transition-colors ${
                selectedIds.has(supplier.supplierId)
                  ? 'bg-primary/5'
                  : ''
              }`}
              onClick={() => {
                if (selectedIds.has(supplier.supplierId)) {
                  selectedIds.delete(supplier.supplierId)
                } else {
                  selectedIds.add(supplier.supplierId)
                }
                setSelectedIds(new Set(selectedIds))
                onSelectSupplier?.(supplier.supplierId)
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{supplier.supplierName}</p>
                  <p className="text-xs text-muted-foreground">{supplier.supplierType}</p>
                </div>
                <span className={`px-2 py-1 rounded font-semibold text-sm ${getRatingColor(supplier.overallScore)}`}>
                  {supplier.overallScore.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Quality</span>
                  <span className={`text-xs font-semibold ${getRatingColor(supplier.avgQualityRating)} px-1 py-0.5 rounded inline-block`}>
                    {supplier.avgQualityRating.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Delivery</span>
                  <span className={`text-xs font-semibold ${getRatingColor(supplier.avgDeliveryRating)} px-1 py-0.5 rounded inline-block`}>
                    {supplier.avgDeliveryRating.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">On-Time</span>
                  <span className={`text-xs font-semibold ${getPercentColor(supplier.onTimeDeliveryPercent)} px-1 py-0.5 rounded inline-block`}>
                    {supplier.onTimeDeliveryPercent}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{supplier.totalOrders} orders</span>
                <span className="font-medium">${supplier.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selection info */}
        {selectedIds.size > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded text-sm">
            {selectedIds.size} supplier(s) selected
          </div>
        )}
      </CardContent>
    </Card>
  )
}
