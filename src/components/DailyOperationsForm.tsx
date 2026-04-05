'use client'

import { useState } from 'react'
import { LucideCheck, LucideLoader2 } from 'lucide-react'
import { logDailyOperation } from '@/app/(app)/compliance/actions'
import { DailyOperationType } from '@/types/database'

export function DailyOperationsForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [type, setType] = useState<DailyOperationType>('removal_taxpaid')
  const [quantity, setQuantity] = useState('1.0')
  const [unit, setUnit] = useState('bbl')
  const [remarks, setRemarks] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await logDailyOperation({
      logDate: date,
      operationType: type,
      quantity: parseFloat(quantity),
      unit,
      ttbReportable: true,
      remarks
    })
    
    if (result.success) {
      setSuccess(true)
      setQuantity('')
      setRemarks('')
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-foreground">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="space-y-1.5 flex flex-col">
          <span className="text-xs font-black uppercase text-muted-foreground">Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50" />
        </label>
        
        <label className="space-y-1.5 flex flex-col">
          <span className="text-xs font-black uppercase text-muted-foreground">Type</span>
          <select value={type} onChange={e => setType(e.target.value as DailyOperationType)} className="w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer">
            <option value="removal_taxpaid">Removal (Taxpaid)</option>
            <option value="removal_tax_free">Removal (Tax-Free)</option>
            <option value="return_to_brewery">Return to Brewery</option>
            <option value="breakage_destruction">Breakage/Destruction</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-1.5 flex flex-col">
          <span className="text-xs font-black uppercase text-muted-foreground">Quantity</span>
          <input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required className="w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" />
        </label>

        <label className="space-y-1.5 flex flex-col">
          <span className="text-xs font-black uppercase text-muted-foreground">Unit</span>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer">
            <option value="bbl">BBL (Barrels)</option>
            <option value="gal">Gallons</option>
            <option value="l">Liters</option>
          </select>
        </label>
      </div>

      <label className="space-y-1.5 flex flex-col pt-2">
        <span className="text-xs font-black uppercase text-muted-foreground">TTB Remarks (Form 5130.9)</span>
        <input type="text" placeholder="Short description (e.g. 'Forklift incident in walk-in')" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50" />
      </label>

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <LucideLoader2 className="w-4 h-4 animate-spin text-black" /> : success ? <LucideCheck className="w-4 h-4 text-black" /> : null}
          {success ? 'Operation Logged' : 'Log Operation'}
        </button>
      </div>
    </form>
  )
}
