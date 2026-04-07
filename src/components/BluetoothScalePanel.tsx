'use client'

import { useState } from 'react'
import { BluetoothScale, type ScaleReading } from '@/components/BluetoothScale'
import { updateStock } from '@/app/(app)/inventory/actions'
import { LucideScale, LucideChevronDown, LucideChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  item_type: string
  current_stock: number
  unit: string
}

interface BluetoothScalePanelProps {
  items: InventoryItem[]
}

/**
 * Collapsible panel on the Inventory page.
 * Shows the full BLE scale card + a dropdown to pick which item to update.
 */
export function BluetoothScalePanel({ items }: BluetoothScalePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string>('')

  const handleWeightCaptured = async (reading: ScaleReading) => {
    if (!selectedItem) {
      toast.error('Select an inventory item first')
      return
    }

    const item = items.find(i => i.id === selectedItem)
    if (!item) return

    // Calculate the adjustment (new weight - current stock)
    const adjustment = reading.weight - item.current_stock

    const formData = new FormData()
    formData.set('id', selectedItem)
    formData.set('adjustment', String(adjustment))

    try {
      await updateStock(formData)
      toast.success(`Updated ${item.name} → ${reading.weight} ${reading.unit}`)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to update stock')
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <LucideScale className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground group-hover:text-foreground transition-colors">
              Bluetooth Scale
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">
              Connect a BLE scale to auto-weigh ingredients
            </p>
          </div>
        </div>
        {expanded ? (
          <LucideChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <LucideChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="border-t border-border pt-4" />

          <div className="grid md:grid-cols-2 gap-4">
            {/* Scale card */}
            <BluetoothScale onWeightCaptured={handleWeightCaptured} />

            {/* Item picker */}
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <div>
                <p className="text-sm font-black tracking-tight text-foreground">Target Item</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                  Select which inventory item to update with the scale reading
                </p>
              </div>

              {items.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                        selectedItem === item.id
                          ? 'border-blue-500/30 bg-blue-500/[0.05]'
                          : 'border-border bg-surface hover:bg-surface-hover'
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn(
                          'text-sm font-bold truncate',
                          selectedItem === item.id ? 'text-blue-300' : 'text-muted-foreground'
                        )}>
                          {item.name}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {item.item_type} · {item.current_stock} {item.unit}
                        </p>
                      </div>
                      {selectedItem === item.id && (
                        <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-muted-foreground">No inventory items yet</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">Add items first, then use the scale</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
