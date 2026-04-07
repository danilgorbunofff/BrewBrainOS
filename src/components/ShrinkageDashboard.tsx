'use client'

/**
 * Shrinkage Alerts Dashboard Widget
 * Displays recent shrinkage alerts and statistics for a brewery
 */

import React, { useEffect, useState } from 'react'
import { getShrinkageAlerts, getShrinkageStats } from '@/app/actions/shrinkage'
import { ShrinkageAlert } from '@/types/database'
import { ShrinkageAlertsContainer } from './ShrinkageAlertCard'
import { LucideAlertTriangle, LucideAlertCircle, LucideTrendingDown, LucideRefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ShrinkageDashboardProps {
  maxAlerts?: number
  showStats?: boolean
}

/**
 * Shrinkage Alerts Dashboard
 * Shows summary statistics and recent alerts
 */
export function ShrinkageDashboard({ maxAlerts = 5, showStats = true }: ShrinkageDashboardProps) {
  const [alerts, setAlerts] = useState<ShrinkageAlert[]>([])
  const [stats, setStats] = useState({
    total_alerts: 0,
    critical_alerts: 0,
    this_month_loss: 0,
    average_monthly_loss: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = async (showRefreshToast = false) => {
    try {
      const [alertsResult, statsResult] = await Promise.all([
        getShrinkageAlerts('unresolved'),
        getShrinkageStats(),
      ])

      if (alertsResult.success) {
        setAlerts(alertsResult.data.slice(0, maxAlerts))
      }

      if (statsResult.success) {
        setStats(statsResult.data)
      }

      if (showRefreshToast) {
        toast.success('Alerts refreshed')
      }
    } catch (e) {
      console.error('Failed to load shrinkage data:', e)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shrinkage Alerts</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor inventory anomalies and loss patterns</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh alerts"
        >
          <LucideRefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Statistics Cards */}
      {showStats && (
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            title="Critical Alerts"
            value={stats.critical_alerts}
            icon={<LucideAlertTriangle className="h-5 w-5 text-red-500" />}
            trend={stats.critical_alerts > 0 ? 'up' : 'stable'}
          />
          <StatCard
            title="Total Alerts"
            value={stats.total_alerts}
            icon={<LucideAlertCircle className="h-5 w-5 text-yellow-500" />}
            trend="neutral"
          />
          <StatCard
            title="This Month Loss"
            value={`${Math.round(stats.this_month_loss * 100) / 100} units`}
            icon={<LucideTrendingDown className="h-5 w-5 text-orange-500" />}
            trend={stats.this_month_loss > 0 ? 'down' : 'stable'}
          />
          <StatCard
            title="Avg Monthly Loss"
            value={`${Math.round(stats.average_monthly_loss * 100) / 100} units`}
            icon={<LucideTrendingDown className="h-5 w-5 text-blue-500" />}
            trend="neutral"
          />
        </div>
      )}

      {/* Alerts List */}
      <div className="border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Recent Unresolved Alerts</h3>
        <ShrinkageAlertsContainer alerts={alerts} isLoading={isLoading} />
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-900 font-semibold mb-2">How Shrinkage Detection Works</p>
        <ul className="text-blue-800 space-y-1 text-xs">
          <li>• <strong>Baseline Analysis:</strong> The system learns your normal loss patterns from 90 days of history</li>
          <li>• <strong>Statistical Detection:</strong> Anomalies are identified using Z-score analysis (items deviating &gt;2.5σ from baseline)</li>
          <li>• <strong>Pattern Recognition:</strong> Gradual leaks, sudden spikes, and high variance are detected separately</li>
          <li>• <strong>Severity Classification:</strong> Losses are categorized as Low (0-5%), Medium (5-15%), High (15-30%), or Critical (30%+)</li>
        </ul>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable' | 'neutral'
}

/**
 * Statistics Card Component
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
      </div>
    </div>
  )
}
