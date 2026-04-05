'use client'

import { useState } from 'react'
import { LucideCalculator } from 'lucide-react'
import { calculateHsiAdjustedIBU } from '@/lib/ibu-calculator'

export function IBUCalculator({ defaultVolume }: { defaultVolume: number }) {
  const [weight, setWeight] = useState<string>('')
  const [boilTime, setBoilTime] = useState<string>('60')
  const [aa, setAa] = useState<string>('')
  const [hsi, setHsi] = useState<string>('15')
  const [volume, setVolume] = useState<string>(defaultVolume.toString() || '10')

  const parsedWeight = parseFloat(weight) || 0
  const parsedBoil = parseFloat(boilTime) || 0
  const parsedAa = parseFloat(aa) || 0
  const parsedHsi = parseFloat(hsi) || 0
  const parsedVol = parseFloat(volume) * 31 // BBL to Gallon conversion roughly

  const ibu = calculateHsiAdjustedIBU(parsedWeight, parsedBoil, parsedAa, parsedHsi, parsedVol)

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mt-6">
      <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
        <LucideCalculator className="h-5 w-5 text-primary" /> HSI-Adjusted IBU Calculator
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <label className="block">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Hop Weight (lbs)</span>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Boil Time (min)</span>
          <input type="number" value={boilTime} onChange={e => setBoilTime(e.target.value)} className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Original AA%</span>
          <input type="number" value={aa} onChange={e => setAa(e.target.value)} className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-muted-foreground">HSI Loss %</span>
          <input type="number" value={hsi} onChange={e => setHsi(e.target.value)} className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
        </label>
      </div>
      
      <div className="bg-black/40 border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground block">Realized Hop Utilization Yield</span>
          <span className="text-xs text-muted-foreground block mt-1">Adjusted given HSI degradation age.</span>
        </div>
        <div className="text-right">
           <span className="text-3xl font-black text-primary">{ibu || 0}</span>
           <span className="text-sm font-bold text-muted-foreground ml-1">IBU</span>
        </div>
      </div>
    </div>
  )
}
