'use client'

/**
 * ShrinkageAlertCard Component
 * Displays anomaly detection results and allows users to take action
 */

import React, { useState } from 'react'
import { ShrinkageAlert, ShrinkageAlertStatus } from '@/types/database'
import { updateShrinkageAlertStatus } from '@/app/actions/shrinkage'
import { toast } from 'sonner'
import { LucideAlertTriangle, LucideAlertCircle, LucideCheckCircle, LucideLoader2, LucideChevronDown } from 'lucide-react'

interface ShrinkageAlertCardProps {
  alert: ShrinkageAlert & { inventory?: { name: string; item_type: string; unit: string } }
  onStatusChange?: (status: ShrinkageAlertStatus) => void
}

/**
 * Get color scheme for severity level
 */
function getSeverityStyle(severity: string): { bg: string; border: string; icon: string; label: string } {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-50', border: 'border-red-300', icon: 'text-red-600', label: 'Critical Loss' }
    case 'high':
      return { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-600', label: 'High Loss' }
    case 'medium':
      return { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: 'text-yellow-600', label: 'Medium Loss' }
    default:
      return { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-600', label: 'Low Loss' }
  }
}

/**
 * Get description for alert type
 */
function getAlertTypeDescription(type: string): string {
  switch (type) {
    case 'unusual_single_loss':
      return 'Single large loss detected that deviates from normal patterns'
    case 'pattern_degradation':
      return 'Consistent gradual losses suggesting leakage or evaporation'
    case 'sudden_spike':
      return 'Sudden drop in inventory that exceeds normal variance'
    case 'high_variance':
      return 'Inconsistent stock levels suggesting tracking issues'
    case 'variance_threshold_exceeded':
      return 'Stock loss exceeds expected operational variance'
    default:
      return 'Inventory anomaly detected'
  }
}

export function ShrinkageAlertCard({ alert, onStatusChange }: ShrinkageAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ShrinkageAlertStatus>(alert.status)

  const severity = getSeverityStyle(alert.severity)

  const handleStatusChange = async (newStatus: ShrinkageAlertStatus) => {
    setIsUpdating(true)
    try {
      const result = await updateShrinkageAlertStatus(alert.id, newStatus)
      if (result.success) {
        setSelectedStatus(newStatus)
        toast.success(`Alert marked as ${newStatus}`)
        onStatusChange?.(newStatus)
      } else {
        toast.error(result.error || 'Failed to update alert')
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      toast.error('Failed to update alert')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusLabels: Record<ShrinkageAlertStatus, string> = {
    unresolved: 'Unresolved',
    acknowledged: 'Acknowledged',
    investigating: 'Investigating',
    resolved: 'Resolved',
    false_positive: 'False Positive',
  }

  const lossPercentageColor =
    alert.loss_percentage > 30 ? 'text-red-600' : alert.loss_percentage > 15 ? 'text-orange-600' : 'text-yellow-600'

  return (
    <div className={`rounded-lg border ${severity.border} px-4 py-3 ${severity.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {alert.severity === 'critical' && <LucideAlertTriangle className={`h-5 w-5 mt-0.5 ${severity.icon}`} />}
          {alert.severity === 'high' && <LucideAlertCircle className={`h-5 w-5 mt-0.5 ${severity.icon}`} />}
          {alert.severity === 'medium' && <LucideAlertCircle className={`h-5 w-5 mt-0.5 ${severity.icon}`} />}
          {alert.severity === 'low' && <LucideAlertCircle className={`h-5 w-5 mt-0.5 ${severity.icon}`} />}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {alert.inventory?.name || 'Unknown Item'} — {severity.label}
              </h3>
              <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded font-medium">{statusLabels[selectedStatus]}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{getAlertTypeDescription(alert.alert_type)}</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-white hover:bg-opacity-40 rounded transition-colors"
          aria-label="Expand alert details"
        >
          <LucideChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-600 font-medium">Loss Amount</p>
          <p className={`font-semibold ${lossPercentageColor}`}>
            {Math.round(alert.loss_amount * 100) / 100} {alert.inventory?.unit || 'units'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Loss %</p>
          <p className={`font-semibold ${lossPercentageColor}`}>{Math.round(alert.loss_percentage * 10) / 10}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">Confidence</p>
          <p className="font-semibold text-gray-900">{Math.round(alert.confidence_score)}%</p>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-current border-opacity-10 pt-4">
          {/* Stock Analysis */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Stock Analysis</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">Expected Stock</p>
                <p className="font-semibold">
                  {Math.round(alert.expected_stock * 100) / 100} {alert.inventory?.unit || 'units'}
                </p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">Actual Stock</p>
                <p className="font-semibold">
                  {Math.round(alert.actual_stock * 100) / 100} {alert.inventory?.unit || 'units'}
                </p>
              </div>
            </div>
          </div>

          {/* Statistical Data */}
          {alert.z_score !== undefined && alert.z_score !== null && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Statistical Analysis</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white bg-opacity-50 rounded p-2">
                  <p className="text-xs text-gray-600">Z-Score</p>
                  <p className="font-semibold">{(Math.round(alert.z_score * 100) / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {Math.abs(alert.z_score) > 2.5
                      ? 'Significant anomaly'
                      : Math.abs(alert.z_score) > 1.5
                        ? 'Moderate anomaly'
                        : 'Minor deviation'}
                  </p>
                </div>
                <div className="bg-white bg-opacity-50 rounded p-2">
                  <p className="text-xs text-gray-600">Monthly Avg Loss</p>
                  <p className="font-semibold">
                    {Math.round((alert.average_monthly_loss || 0) * 100) / 100} {alert.inventory?.unit || 'units'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detection Timestamp */}
          <div className="text-xs text-gray-600">
            <p>
              Detected: {new Date(alert.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-current border-opacity-10">
            <button
              onClick={() => handleStatusChange('acknowledged')}
              disabled={isUpdating || selectedStatus === 'acknowledged'}
              className="text-xs px-2 py-1 rounded bg-white bg-opacity-60 hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isUpdating && selectedStatus === 'acknowledged' ? (
                <LucideLoader2 className="h-3 w-3 inline mr-1 animate-spin" />
              ) : (
                'Acknowledge'
              )}
            </button>
            <button
              onClick={() => handleStatusChange('investigating')}
              disabled={isUpdating || selectedStatus === 'investigating'}
              className="text-xs px-2 py-1 rounded bg-white bg-opacity-60 hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isUpdating && selectedStatus === 'investigating' ? (
                <LucideLoader2 className="h-3 w-3 inline mr-1 animate-spin" />
              ) : (
                'Investigating'
              )}
            </button>
            <button
              onClick={() => handleStatusChange('resolved')}
              disabled={isUpdating || selectedStatus === 'resolved'}
              className="text-xs px-2 py-1 rounded bg-white bg-opacity-60 hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isUpdating && selectedStatus === 'resolved' ? (
                <LucideLoader2 className="h-3 w-3 inline mr-1 animate-spin" />
              ) : (
                'Resolved'
              )}
            </button>
            <button
              onClick={() => handleStatusChange('false_positive')}
              disabled={isUpdating || selectedStatus === 'false_positive'}
              className="text-xs px-2 py-1 rounded bg-white bg-opacity-60 hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium ml-auto"
            >
              {isUpdating && selectedStatus === 'false_positive' ? (
                <LucideLoader2 className="h-3 w-3 inline mr-1 animate-spin" />
              ) : (
                'False Positive'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ShrinkageAlertsContainerProps {
  alerts: (ShrinkageAlert & { inventory?: { name: string; item_type: string; unit: string } })[]
  isLoading?: boolean
}

/**
 * Container component for displaying multiple alerts
 */
export function ShrinkageAlertsContainer({ alerts, isLoading }: ShrinkageAlertsContainerProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <LucideCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No inventory anomalies detected</p>
        <p className="text-xs text-gray-500 mt-1">Stock levels are within expected ranges</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <ShrinkageAlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
