'use client'

import { useState } from 'react'
import { LucideCheck, LucideActivity, LucideLoader2 } from 'lucide-react'
import { logBrewingMetrics } from '@/app/(app)/recipes/actions'

export function BrewingMetricsForm({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [ph, setPh] = useState('')
  const [boilOff, setBoilOff] = useState('')
  const [ibu, setIbu] = useState('')
  const [waterChem, setWaterChem] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await logBrewingMetrics(batchId, {
      mashing_ph: ph ? parseFloat(ph) : 0,
      boil_off_rate_pct: boilOff ? parseFloat(boilOff) : 0,
      actual_ibu_calculated: ibu ? parseFloat(ibu) : undefined,
      water_chemistry_notes: waterChem
    })

    if (res.success) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="bg-surface border border-emerald-500/20 rounded-2xl overflow-hidden mt-6">
      <div className="bg-emerald-500/10 px-5 py-3 border-b border-emerald-500/20 flex flex-col">
        <h3 className="font-black text-sm tracking-tight text-emerald-400 flex items-center gap-2">
          <LucideActivity className="w-4 h-4" /> Brew Day Metrics (Process Optimization)
        </h3>
        <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-0.5">Track process execution variance</p>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Mashing pH</span>
            <input type="number" step="0.01" value={ph} onChange={e => setPh(e.target.value)} placeholder="e.g. 5.2" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-emerald-500 outline-none" />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Boil Off %</span>
            <input type="number" step="0.1" value={boilOff} onChange={e => setBoilOff(e.target.value)} placeholder="e.g. 8.5" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-emerald-500 outline-none" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-muted-foreground">HSI-Adjusted IBU</span>
            <input type="number" step="1" value={ibu} onChange={e => setIbu(e.target.value)} placeholder="e.g. 45" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-emerald-500 outline-none" />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Water Chem Notes</span>
            <input type="text" value={waterChem} onChange={e => setWaterChem(e.target.value)} placeholder="e.g. 3g Gypsum added" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-emerald-500 outline-none" />
          </label>
        </div>
        
        <button type="submit" disabled={loading} className="w-full py-2 bg-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
          {loading ? <LucideLoader2 className="w-4 h-4 animate-spin"/> : success ? <LucideCheck className="w-4 h-4"/> : null}
          {success ? 'Metrics Saved' : 'Log Brew Day Metrics'}
        </button>
      </form>
    </div>
  )
}
