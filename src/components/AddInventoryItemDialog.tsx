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
      <DialogContent className="sm:max-w-2xl glass border-border p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-3xl font-black tracking-tighter">Inventory Sync</DialogTitle>
          <DialogDescription className="text-muted-foreground">
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
              <Label htmlFor="inv-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Component Identifier</Label>
              <Input id="inv-name" name="name" required placeholder="e.g. Cascade Hops T90" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Classification</Label>
                <Select value={itemType} onValueChange={(v) => v && setItemType(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary border-border text-foreground font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border text-foreground">
                    <SelectItem value="hop">Hops</SelectItem>
                    <SelectItem value="grain">Grain</SelectItem>
                    <SelectItem value="yeast">Yeast</SelectItem>
                    <SelectItem value="adjunct">Adjunct</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Measurement Unit</Label>
                <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary border-border text-foreground font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border text-foreground">
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
                  <Label htmlFor="inv-stock" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Reserve</Label>
                  <BluetoothScale compact onWeightCaptured={handleWeightCaptured} />
                </div>
                <Input ref={stockInputRef} id="inv-stock" name="currentStock" type="number" step="0.1" required defaultValue="0" min="0" className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-reorder" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Alert Threshold</Label>
                <Input id="inv-reorder" name="reorderPoint" type="number" step="0.1" required defaultValue="5" min="0" className="font-mono text-primary" />
              </div>
            </div>

            {/* Lot Tracking Fields */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid gap-2">
                <Label htmlFor="inv-lot" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Lot Number</Label>
                <Input id="inv-lot" name="lotNumber" placeholder="e.g. LOT2024-1501" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="inv-expiration" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Expiration Date</Label>
                  <Input id="inv-expiration" name="expirationDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-manufacturer" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Manufacturer</Label>
                  <Input id="inv-manufacturer" name="manufacturer" placeholder="e.g. Yakima Chief" />
                </div>
              </div>
            </div>

            {/* Degradation Metrics - Hops */}
            {itemType === 'hop' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">🌱 Hop Quality Tracking</h3>
                  <p className="text-xs text-muted-foreground">Track alpha acid potency over time</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-hsi" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Initial HSI (%)</Label>
                    <Input id="inv-hsi" name="hsiInitial" type="number" step="0.1" min="0" max="100" defaultValue="100" placeholder="100" className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-received" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Received Date</Label>
                    <Input id="inv-received" name="receivedDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Storage Condition</Label>
                  <Select name="storageCondition" defaultValue="cool_dry">
                    <SelectTrigger className="h-11 rounded-xl bg-secondary border-border text-foreground font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-border text-foreground">
                      <SelectItem value="cool_dry">🧊 Cool & Dry (Ideal)</SelectItem>
                      <SelectItem value="cool_humid">💨 Cool & Humid (Good)</SelectItem>
                      <SelectItem value="room_temp">🌡️ Room Temperature (Fair)</SelectItem>
                      <SelectItem value="warm">🔥 Warm (Poor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Degradation Metrics - Grain */}
            {itemType === 'grain' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">🌾 Grain Quality Tracking</h3>
                  <p className="text-xs text-muted-foreground">Monitor moisture and extract potential</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-moisture" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Moisture (%)</Label>
                    <Input id="inv-moisture" name="grainMoistureInitial" type="number" step="0.1" min="0" max="30" defaultValue="10" placeholder="10" className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-ppg" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">PPG (Extract Points)</Label>
                    <Input id="inv-ppg" name="ppgInitial" type="number" step="0.1" min="20" max="50" defaultValue="37" placeholder="37" className="font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-grain-received" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Received Date</Label>
                    <Input id="inv-grain-received" name="receivedDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Storage Condition</Label>
                    <Select name="storageCondition" defaultValue="cool_dry">
                      <SelectTrigger className="h-11 rounded-xl bg-secondary border-border text-foreground font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass border-border text-foreground">
                        <SelectItem value="cool_dry">🧊 Cool & Dry (Ideal)</SelectItem>
                        <SelectItem value="cool_humid">💨 Cool & Humid (Good)</SelectItem>
                        <SelectItem value="room_temp">🌡️ Room Temperature (Fair)</SelectItem>
                        <SelectItem value="warm">🔥 Warm (Poor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-4">
              Authorize Component
            </Button>
          </div>
        </FormWithToast>
      </DialogContent>
    </Dialog>
  )
}
