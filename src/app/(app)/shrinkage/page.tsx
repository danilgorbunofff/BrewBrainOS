/**
 * Shrinkage Alerts Dashboard Page
 * Example implementation showing how to integrate shrinkage detection into BrewBrain
 *
 * PATH: src/app/(app)/shrinkage/page.tsx
 *
 * This page demonstrates:
 * - Displaying shrinkage alerts and statistics
 * - Filtering and managing alerts
 * - Integrating with the main dashboard
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ShrinkageDashboard } from '@/components/ShrinkageDashboard'
import { getShrinkageAlerts } from '@/app/actions/shrinkage'
import { ShrinkageAlert } from '@/types/database'
import { LucideFilter, LucideDownload, LucideRefreshCw } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Main Shrinkage Alerts Page
 */
export default function ShrinkagePage() {
  const [alerts, setAlerts] = useState<ShrinkageAlert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<ShrinkageAlert[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('unresolved')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Load alerts on mount and when filters change
  useEffect(() => {
    loadAlerts()
  }, [selectedStatus])

  const loadAlerts = async () => {
    setIsLoading(true)
    try {
      const result = await getShrinkageAlerts(selectedStatus === 'all' ? undefined : selectedStatus)
      if (result.success) {
        setAlerts(result.data)
        applyFilters(result.data, selectedSeverity)
      } else {
        toast.error('Failed to load alerts')
      }
    } catch (e) {
      toast.error('Error loading alerts')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = (alertsToFilter: ShrinkageAlert[], severity: string) => {
    let filtered = alertsToFilter

    if (severity !== 'all') {
      filtered = filtered.filter((a) => a.severity === severity)
    }

    setFilteredAlerts(filtered)
  }

  const handleSeverityChange = (severity: string) => {
    setSelectedSeverity(severity)
    applyFilters(alerts, severity)
  }

  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      toast.error('No alerts to export')
      return
    }

    const headers = [
      'Item Name',
      'Alert Type',
      'Severity',
      'Status',
      'Loss Amount',
      'Loss %',
      'Expected Stock',
      'Actual Stock',
      'Confidence',
      'Detected At',
    ]

    const rows = filteredAlerts.map((alert) => [
      'Unknown', // Would need to join with inventory
      alert.alert_type,
      alert.severity,
      alert.status,
      alert.loss_amount,
      `${alert.loss_percentage}%`,
      alert.expected_stock,
      alert.actual_stock,
      `${alert.confidence_score}%`,
      new Date(alert.detected_at).toLocaleString(),
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shrinkage-alerts-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-8">
      {/* Main Dashboard */}
      <ShrinkageDashboard maxAlerts={100} showStats={true} />

      {/* Advanced Filters */}
      <div className="border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LucideFilter className="h-5 w-5" />
          Alert Filters & Management
        </h3>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'unresolved', 'acknowledged', 'investigating', 'resolved', 'false_positive'].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'critical'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => handleSeverityChange(severity)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSeverity === severity
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={loadAlerts}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LucideRefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LucideDownload className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-muted-foreground font-medium">Total Alerts Loaded</p>
          <p className="text-3xl font-bold mt-2">{alerts.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-muted-foreground font-medium">Current Filter Results</p>
          <p className="text-3xl font-bold mt-2">{filteredAlerts.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-muted-foreground font-medium">Critical Alerts</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            {filteredAlerts.filter((a) => a.severity === 'critical').length}
          </p>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">About Shrinkage Alerts</h4>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>
            <strong>Goal:</strong> Detect unusual inventory losses and discrepancies before they become major issues
          </li>
          <li>
            <strong>Method:</strong> Statistical anomaly detection using Z-score analysis, pattern recognition, and variance monitoring
          </li>
          <li>
            <strong>Baseline:</strong> System requires 30+ days of history to establish normal loss patterns
          </li>
          <li>
            <strong>Severity:</strong> Alerts are classified as Low (0-5%), Medium (5-15%), High (15-30%), or Critical (30%+) loss
          </li>
          <li>
            <strong>Actions:</strong> You can acknowledge, investigate, resolve, or mark alerts as false positives
          </li>
        </ul>
      </div>
    </div>
  )
}
