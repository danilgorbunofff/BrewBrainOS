'use client'

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LucideCalendar } from 'lucide-react'

interface TrendData {
  date: string
  quality: number
  delivery: number
  reliability: number
  pricing: number
  overall: number
}

interface PerformanceTrendChartProps {
  data: TrendData[]
  supplierName: string
  daysBack: number
  onDaysChange?: (days: number) => void
}

export function PerformanceTrendChart({
  data,
  supplierName,
  daysBack,
  onDaysChange,
}: PerformanceTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>{supplierName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-slate-500">
            No trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format dates for display (YYYY-MM-DD → Short date)
  const chartData = data.map((item) => ({
    ...item,
    dateDisplay: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>{supplierName} - Last {daysBack} days</CardDescription>
          </div>
          {onDaysChange && (
            <div className="flex gap-1">
              {[30, 90, 365].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant={daysBack === days ? 'default' : 'outline'}
                  onClick={() => onDaysChange(days)}
                >
                  {days === 365 ? '1Y' : `${days}D`}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Overall Trend */}
          <div>
            <h4 className="text-sm font-medium mb-3">Overall Score Trend</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateDisplay" />
                <YAxis domain={[0, 5]} />
                <Tooltip
                  formatter={(value) => [(value as number).toFixed(2), 'Score']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #64748b',
                    borderRadius: '6px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="overall"
                  stroke="#3b82f6"
                  dot={{ r: 3 }}
                  strokeWidth={2}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Dimensions */}
          <div>
            <h4 className="text-sm font-medium mb-3">Dimension Scores</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateDisplay" />
                <YAxis domain={[0, 5]} />
                <Tooltip
                  formatter={(value) => [(value as number).toFixed(2)]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #64748b',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="quality"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  name="Quality"
                />
                <Line
                  type="monotone"
                  dataKey="delivery"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  name="Delivery"
                />
                <Line
                  type="monotone"
                  dataKey="reliability"
                  stroke="#8b5cf6"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  name="Reliability"
                />
                <Line
                  type="monotone"
                  dataKey="pricing"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  name="Pricing"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Latest Overall Score</div>
              <div className="text-lg font-bold">
                {chartData[chartData.length - 1]?.overall.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Period Average</div>
              <div className="text-lg font-bold">
                {(chartData.reduce((sum, d) => sum + (d.overall || 0), 0) / chartData.length).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Highest Score</div>
              <div className="text-lg font-bold">
                {Math.max(...chartData.map((d) => d.overall)).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Lowest Score</div>
              <div className="text-lg font-bold">
                {Math.min(...chartData.map((d) => d.overall)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
