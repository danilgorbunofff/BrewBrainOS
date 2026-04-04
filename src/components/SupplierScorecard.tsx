'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideTrendingUp, LucideTrendingDown, LucideBarChart3, LucidePackageCheck, LucideClock, LucideStar } from 'lucide-react'

interface SupplierScore {
  icon: React.ReactNode
  label: string
  value: number | string
  subtext?: string
  color: 'green' | 'yellow' | 'red' | 'blue'
}

interface SupplierScorecardProps {
  supplierId: string
  supplierName: string
  supplierType: string
  analytics: {
    avgQualityRating: number
    avgDeliveryRating: number
    avgReliabilityRating: number
    avgPricingRating: number
    overallScore: number
    onTimeDeliveryPercent: number
    avgDeliveryDays: number
    qualityIssuePercent: number
    wouldOrderAgainPercent: number
    totalOrdersReviewed: number
    totalSpent: number
  }
  onClick?: () => void
  trend?: 'up' | 'down' | 'neutral'
}

function getRatingColor(rating: number) {
  if (rating >= 4) return 'green'
  if (rating >= 2.5) return 'yellow'
  return 'red'
}

function getColorClasses(color: string) {
  switch (color) {
    case 'green':
      return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
    case 'yellow':
      return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
    case 'red':
      return 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
    case 'blue':
      return 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
    default:
      return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
  }
}

function getPercentColor(percent: number) {
  if (percent >= 80) return 'green'
  if (percent >= 60) return 'yellow'
  return 'red'
}

export function SupplierScorecard({
  supplierId,
  supplierName,
  supplierType,
  analytics,
  onClick,
  trend,
}: SupplierScorecardProps) {
  const scores: SupplierScore[] = [
    {
      icon: <LucideStar className="w-5 h-5" />,
      label: 'Quality',
      value: analytics.avgQualityRating.toFixed(1),
      subtext: `/5.0`,
      color: getRatingColor(analytics.avgQualityRating),
    },
    {
      icon: <LucideClock className="w-5 h-5" />,
      label: 'Delivery',
      value: `${analytics.onTimeDeliveryPercent}%`,
      subtext: 'On-time',
      color: getPercentColor(analytics.onTimeDeliveryPercent),
    },
    {
      icon: <LucidePackageCheck className="w-5 h-5" />,
      label: 'Reliability',
      value: analytics.avgReliabilityRating.toFixed(1),
      subtext: `/5.0`,
      color: getRatingColor(analytics.avgReliabilityRating),
    },
    {
      icon: <LucideBarChart3 className="w-5 h-5" />,
      label: 'Price Value',
      value: analytics.avgPricingRating.toFixed(1),
      subtext: `/5.0`,
      color: getRatingColor(analytics.avgPricingRating),
    },
  ]

  const overallColor = getRatingColor(analytics.overallScore)
  const riskIndicator = trend === 'down'

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        onClick ? 'hover:border-primary' : ''
      } ${riskIndicator ? 'border-orange-200 dark:border-orange-800' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{supplierName}</CardTitle>
            <CardDescription>{supplierType}</CardDescription>
          </div>
          {riskIndicator && (
            <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded text-xs font-medium flex items-center gap-1">
              <LucideTrendingDown className="w-3 h-3" />
              Declining
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div
          className={`p-3 rounded-lg flex items-center justify-between ${getColorClasses(
            overallColor
          )}`}
        >
          <div className="font-medium">Overall Score</div>
          <div className="text-2xl font-bold">{analytics.overallScore.toFixed(1)}</div>
        </div>

        {/* Four Dimension Scores */}
        <div className="grid grid-cols-2 gap-2">
          {scores.map((score) => (
            <div
              key={score.label}
              className={`p-2 rounded-lg ${getColorClasses(score.color)}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {score.icon}
                <span className="text-xs font-medium">{score.label}</span>
              </div>
              <div className="text-sm font-bold">{score.value}</div>
              {score.subtext && <div className="text-xs opacity-75">{score.subtext}</div>}
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t dark:border-slate-700">
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400">Orders</div>
            <div className="text-lg font-bold">{analytics.totalOrdersReviewed}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400">Issues</div>
            <div className="text-lg font-bold">{analytics.qualityIssuePercent}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400">Reorder</div>
            <div className="text-lg font-bold">{analytics.wouldOrderAgainPercent}%</div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="pt-2 border-t dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Spent (This Period)</div>
          <div className="text-xl font-bold">${analytics.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>

        {/* Action Button */}
        {onClick && (
          <Button
            className="w-full mt-2"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
