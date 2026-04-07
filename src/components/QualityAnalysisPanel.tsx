'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideAlertCircle, LucideCheckCircle, LucideTrendingDown } from 'lucide-react'

interface QualityIssuesData {
  issueOrderCount: number
  totalOrdersReviewed: number
  issuePercent: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentIssueOrders: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lowQualityRatings: any[]
}

interface QualityAnalysisPanelProps {
  data: QualityIssuesData
  supplierName: string
}

export function QualityAnalysisPanel({
  data,
  supplierName,
}: QualityAnalysisPanelProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-500">No quality data available</div>
        </CardContent>
      </Card>
    )
  }

  const issueStatus =
    data.issuePercent === 0
      ? 'green'
      : data.issuePercent < 20
        ? 'yellow'
        : 'red'

  const issueIcon =
    issueStatus === 'green' ? (
      <LucideCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
    ) : issueStatus === 'yellow' ? (
      <LucideTrendingDown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
    ) : (
      <LucideAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    )

  const statusBg =
    issueStatus === 'green'
      ? 'bg-green-50 dark:bg-green-950'
      : issueStatus === 'yellow'
        ? 'bg-yellow-50 dark:bg-yellow-950'
        : 'bg-red-50 dark:bg-red-950'

  const statusText =
    issueStatus === 'green'
      ? 'text-green-700 dark:text-green-300'
      : issueStatus === 'yellow'
        ? 'text-yellow-700 dark:text-yellow-300'
        : 'text-red-700 dark:text-red-300'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Analysis</CardTitle>
        <CardDescription>{supplierName}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Issue Rate */}
        <div className={`p-4 rounded-lg ${statusBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${statusText}`}>Quality Issue Rate</span>
            {issueIcon}
          </div>
          <div className={`text-3xl font-bold ${statusText}`}>{data.issuePercent}%</div>
          <div className={`text-sm ${statusText} opacity-75`}>
            {data.issueOrderCount} of {data.totalOrdersReviewed} orders reported issues
          </div>
        </div>

        {/* Progress bar for visual representation */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Issue Frequency</span>
            <span className="font-medium">{data.issuePercent}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                issueStatus === 'green'
                  ? 'bg-green-600'
                  : issueStatus === 'yellow'
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(data.issuePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Recent Issues */}
        {data.recentIssueOrders && data.recentIssueOrders.length > 0 && (
          <div className="border-t dark:border-slate-700 pt-4">
            <h4 className="font-medium text-sm mb-2">Recent Issues</h4>
            <div className="space-y-2">
              {data.recentIssueOrders.slice(0, 3).map((order, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        Order #{order.order_number}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(order.order_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                      Issue
                    </span>
                  </div>
                  {order.issue_description && (
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                      &quot;{order.issue_description}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Quality Ratings */}
        {data.lowQualityRatings && data.lowQualityRatings.length > 0 && (
          <div className="border-t dark:border-slate-700 pt-4">
            <h4 className="font-medium text-sm mb-2">Low Quality Ratings (&lt; 3.0)</h4>
            <div className="space-y-2">
              {data.lowQualityRatings.slice(0, 3).map((rating, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-yellow-900 dark:text-yellow-100">
                        Quality: {rating.quality_rating?.toFixed(1)}/5.0
                      </div>
                      <div className="text-xs text-yellow-800 dark:text-yellow-200">
                        {new Date(rating.rating_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {rating.comments && (
                    <div className="mt-1 text-xs text-yellow-800 dark:text-yellow-200 italic">
                      &quot;{rating.comments}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Issues State */}
        {data.issuePercent === 0 && (
          <div className="border-t dark:border-slate-700 pt-4">
            <div className="p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded text-center">
              <LucideCheckCircle className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">No quality issues reported</div>
              <div className="text-xs opacity-75">Excellent track record!</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
