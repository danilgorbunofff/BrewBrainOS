'use client'

import { useState, useTransition } from 'react'
import { LucideSettings, LucideX, LucideLoader2, LucideCheck, LucideZap } from 'lucide-react'
import { setDevSubscriptionTier, seedMockBatches } from '@/app/(app)/dev-actions'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DevToolsProps {
  activeBreweryId: string | null
  currentTier: string
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Free Tier', desc: 'Baseline limits' },
  { value: 'nano', label: 'Nano Tier', desc: '5 Tanks, 10 Batches' },
  { value: 'production', label: 'Production Tier', desc: 'AI Logs, TTB Reports' },
  { value: 'multi_site', label: 'Multi-Site Tier', desc: 'Unlimited Sites' },
]

export function DevTools({ activeBreweryId, currentTier }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingTier, setPendingTier] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const router = useRouter()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  if (!activeBreweryId) return null

  const handleTierSelect = (newTier: string) => {
    if (newTier === currentTier) return
    
    setPendingTier(newTier)
    startTransition(async () => {
      try {
        await setDevSubscriptionTier(activeBreweryId, newTier)
        router.refresh()
      } finally {
        setPendingTier(null)
      }
    })
  }

  return (
    <div className="fixed top-4 right-4 z-[100] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="h-10 w-10 rounded-full bg-purple-600/90 text-white shadow-xl shadow-purple-600/20 backdrop-blur border border-purple-400 flex items-center justify-center hover:bg-purple-500 transition-colors"
          title="Dev Tools"
        >
          <LucideSettings className="h-5 w-5" />
        </button>
      ) : (
        <div className="w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-950/30 border-b border-purple-500/20">
            <span className="text-xs font-black text-purple-400 tracking-widest uppercase flex items-center gap-2">
              <LucideZap className="h-3.5 w-3.5 fill-purple-400" /> Overdrive DevTools
            </span>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <LucideX className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Subscription Override
                </label>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                  Current: {currentTier}
                </span>
              </div>
              
              <button
                onClick={async () => {
                  setIsSeeding(true)
                  try {
                    await seedMockBatches(activeBreweryId)
                    router.refresh()
                  } finally {
                    setIsSeeding(false)
                  }
                }}
                disabled={isSeeding}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-black uppercase tracking-wider"
              >
                {isSeeding ? <LucideLoader2 className="h-4 w-4 animate-spin" /> : <LucideZap className="h-4 w-4" />}
                Seed 10 Batches
              </button>
              
              <div className="grid gap-2 mt-4">
                {TIER_OPTIONS.map((opt) => {
                  const isActive = currentTier === opt.value
                  const isChanging = pendingTier === opt.value
                  
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleTierSelect(opt.value)}
                      disabled={isPending}
                      className={cn(
                        "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all",
                        isActive 
                          ? "bg-purple-500/10 border-purple-500/50 text-purple-100" 
                          : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05] hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black",
                        isActive ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-zinc-700"
                      )}>
                        {isChanging ? <LucideLoader2 className="h-3 w-3 animate-spin" /> : isActive ? <LucideCheck className="h-3 w-3" /> : opt.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={cn("text-xs font-black", isActive ? "text-white" : "group-hover:text-zinc-200")}>
                          {opt.label}
                        </p>
                        <p className="text-[9px] font-bold text-zinc-600 truncate">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            <p className="text-[8px] text-center font-black text-zinc-700 uppercase tracking-tighter">
              Development Environment Only — Direct DB Mutation
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
