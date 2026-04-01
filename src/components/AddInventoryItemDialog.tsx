'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LucidePlus } from 'lucide-react'
import { addInventoryItem } from '@/app/(app)/inventory/actions'
import { useState, useRef } from 'react'
import { BluetoothScale, type ScaleReading } from '@/components/BluetoothScale'

export function AddInventoryItemDialog() {
  const [itemType, setItemType] = useState('Hops')
  const [unit, setUnit] = useState('kg')
  const stockInputRef = useRef<HTMLInputElement>(null)

  const handleWeightCaptured = (reading: ScaleReading) => {
    if (stockInputRef.current) {
      stockInputRef.current.value = String(reading.weight)
      // Also sync the unit selector to match the scale
      if (reading.unit === 'kg' || reading.unit === 'lbs' || reading.unit === 'oz') {
        setUnit(reading.unit)
      }
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button size="lg" className="gap-2" />}
      >
        <LucidePlus className="size-5" />
        Provision Slot
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass border-white/5 p-8">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-3xl font-black tracking-tighter">Inventory Sync</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Register a new logistical component to the floor inventory.
          </DialogDescription>
        </DialogHeader>
        <form action={addInventoryItem} className="space-y-6 pt-6">
          {/* Hidden inputs carry the Select state since Base UI Select doesn't emit native form data */}
          <input type="hidden" name="item_type" value={itemType} />
          <input type="hidden" name="unit" value={unit} />

          <div className="grid gap-2">
            <Label htmlFor="inv-name" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Component Identifier</Label>
            <Input id="inv-name" name="name" required placeholder="e.g. Cascade Hops T90" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Classification</Label>
              <Select value={itemType} onValueChange={(v) => v && setItemType(v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-zinc-300 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/5 text-zinc-200">
                  <SelectItem value="Hops">Hops</SelectItem>
                  <SelectItem value="Grain">Grain</SelectItem>
                  <SelectItem value="Yeast">Yeast</SelectItem>
                  <SelectItem value="Adjunct">Adjunct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Measurement Unit</Label>
              <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-zinc-300 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/5 text-zinc-200">
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="units">units</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="inv-stock" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Initial Reserve</Label>
                <BluetoothScale compact onWeightCaptured={handleWeightCaptured} />
              </div>
              <Input ref={stockInputRef} id="inv-stock" name="current_stock" type="number" step="0.1" required defaultValue="0" min="0" className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-reorder" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Alert Threshold</Label>
              <Input id="inv-reorder" name="reorder_point" type="number" step="0.1" required defaultValue="5" min="0" className="font-mono text-primary" />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-4">
            Authorize Component
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
