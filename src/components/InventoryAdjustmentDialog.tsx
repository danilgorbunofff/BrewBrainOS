'use client'

/**
 * Inventory Adjustment Dialog
 * Records stock changes and triggers shrinkage analysis
 */

import React, { useState } from 'react'
import { recordInventoryChange } from '@/app/actions/shrinkage'
import { toast } from 'sonner'
import { LucideX, LucideLoader2, LucideAlertTriangle } from 'lucide-react'

interface InventoryAdjustmentDialogProps {
  inventoryId: string
  inventoryName: string
  currentStock: number
  unit: string
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Dialog for adjusting inventory and recording the change
 */
export function InventoryAdjustmentDialog({
  inventoryId,
  inventoryName,
  currentStock,
  unit,
  onClose,
  onSuccess,
}: InventoryAdjustmentDialogProps) {
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [changeType, setChangeType] = useState<'stock_adjustment' | 'recipe_usage' | 'received' | 'waste' | 'other'>(
    'stock_adjustment'
  )
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const quantity_change = parseFloat(newStock) - currentStock
  const isDecrease = quantity_change < 0
  const percentChange = ((Math.abs(quantity_change) / currentStock) * 100).toFixed(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNaN(parseFloat(newStock))) {
      toast.error('Invalid stock amount')
      return
    }

    setIsLoading(true)
    try {
      const result = await recordInventoryChange(
        inventoryId,
        currentStock,
        parseFloat(newStock),
        changeType,
        reason || undefined
      )

      if (result.success) {
        toast.success(`${inventoryName} updated: ${isDecrease ? '-' : '+'}${Math.abs(quantity_change)} ${unit}`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(result.error || 'Failed to update inventory')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update inventory')
    } finally {
      setIsLoading(false)
    }
  }

  const changeTypeLabels = {
    stock_adjustment: 'Manual Adjustment',
    recipe_usage: 'Used in Recipe/Batch',
    received: 'New Delivery/Receipt',
    waste: 'Waste/Disposal',
    other: 'Other',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Adjust Inventory</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Item</p>
            <p className="font-semibold">{inventoryName}</p>
          </div>

          {/* Current Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Stock
            </label>
            <div className="p-3 bg-gray-100 rounded text-sm font-medium">
              {currentStock} {unit}
            </div>
          </div>

          {/* New Stock */}
          <div>
            <label htmlFor="newStock" className="block text-sm font-medium text-gray-700 mb-1">
              New Stock Amount
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="newStock"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                step="0.01"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="text-sm font-medium text-gray-600">{unit}</span>
            </div>
          </div>

          {/* Change Summary */}
          {!isNaN(parseFloat(newStock)) && newStock !== currentStock.toString() && (
            <div
              className={`p-3 rounded text-sm ${
                isDecrease
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="font-semibold">
                {isDecrease ? '✓ Decrease' : '✓ Increase'}
              </div>
              <div className="text-xs mt-1">
                {Math.abs(quantity_change)} {unit} ({percentChange}%)
              </div>
            </div>
          )}

          {/* Anomaly Warning */}
          {isDecrease && Math.abs(quantity_change) > currentStock * 0.2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-3">
              <LucideAlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Large loss detected</p>
                <p className="text-xs text-yellow-800 mt-1">
                  This will trigger shrinkage anomaly detection
                </p>
              </div>
            </div>
          )}

          {/* Change Type */}
          <div>
            <label htmlFor="changeType" className="block text-sm font-medium text-gray-700 mb-1">
              What caused this change?
            </label>
            <select
              id="changeType"
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(changeTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason/Notes (optional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., 'Used in Hazy IPA batch', 'Disposed of expired grain'"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <LucideLoader2 className="h-4 w-4 animate-spin" />}
              Save Change
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
