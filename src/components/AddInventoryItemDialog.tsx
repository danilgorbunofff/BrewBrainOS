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
import { FormWithToast } from '@/components/FormWithToast'

export function AddInventoryItemDialog() {
  const [open, setOpen] = useState(false)
  const [itemType, setItemType] = useState('hop')
  const [unit, setUnit] = useState('kg')
  const stockInputRef = useRef<HTMLInputElement>(null)

  const handleWeightCaptured = (reading: ScaleReading) => {
    if (stockInputRef.current) {
      stockInputRef.current.value = String(reading.weight)
      if (reading.unit === 'kg' || reading.unit === 'lbs' || reading.unit === 'oz') {
        setUnit(reading.unit)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        
        <FormWithToast 
          action={addInventoryItem} 
          successMessage="Component authorized successfully"
          onSuccess={() => setOpen(false)}
        >
          <div className="space-y-6 pt-6">
            <input type="hidden" name="itemType" value={itemType} />
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
                    <SelectItem value="hop">Hops</SelectItem>
                    <SelectItem value="grain">Grain</SelectItem>
                    <SelectItem value="yeast">Yeast</SelectItem>
                    <SelectItem value="adjunct">Adjunct</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
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
                <Input ref={stockInputRef} id="inv-stock" name="currentStock" type="number" step="0.1" required defaultValue="0" min="0" className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-reorder" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Alert Threshold</Label>
                <Input id="inv-reorder" name="reorderPoint" type="number" step="0.1" required defaultValue="5" min="0" className="font-mono text-primary" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-4">
              Authorize Component
            </Button>
          </div>
        </FormWithToast>
      </DialogContent>
    </Dialog>
  )
}
