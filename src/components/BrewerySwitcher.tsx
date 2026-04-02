'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LucideBuilding2, LucideChevronDown, LucideCheck,
  LucidePlus, LucideMapPin, LucideLock, LucideLoader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { switchBrewery, createBrewery } from '@/app/(app)/brewery-actions'
import { useSubscription } from '@/components/SubscriptionProvider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Brewery {
  id: string
  name: string
  license_number: string | null
  subscription_tier?: string
}

interface BrewerySwitcherProps {
  breweries: Brewery[]
  activeBreweryId: string | null
  activeBreweryName: string | null
}

export function BrewerySwitcher({ breweries, activeBreweryId, activeBreweryName }: BrewerySwitcherProps) {
  const [open, setOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const switchedToName = useRef<string | null>(null)
  const prevName = useRef<string | null>(activeBreweryName)

  // Trigger toast exactly when the server-side name prop changes
  useEffect(() => {
    if (activeBreweryName !== prevName.current && activeBreweryName === switchedToName.current) {
      toast.success(`Switched to ${activeBreweryName}`)
      switchedToName.current = null
      setPendingId(null)
    }
    prevName.current = activeBreweryName
  }, [activeBreweryName])

  const router = useRouter()
  const { limits } = useSubscription()

  const activeBrewery = breweries.find(b => b.id === activeBreweryId)
  const canAddBrewery = limits.multiSite

  if (breweries.length === 0) return null

  const handleSwitch = async (breweryId: string) => {
    if (breweryId === activeBreweryId) {
      setOpen(false)
      return
    }

    setPendingId(breweryId)
    switchedToName.current = breweries.find(b => b.id === breweryId)?.name || null
    
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('breweryId', breweryId)
        await switchBrewery(formData)
        router.refresh()
        setOpen(false)
      } catch {
        toast.error('Failed to switch brewery')
        setPendingId(null)
        switchedToName.current = null
      }
    })
  }

  const handleCreate = async (formData: FormData) => {
    try {
      await createBrewery(formData)
      toast.success('New brewery created!')
      setShowNewForm(false)
      router.refresh()
      setOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create brewery')
    }
  }

  // Single brewery — show simple badge, no dropdown
  if (breweries.length === 1 && !canAddBrewery) {
    return (
      <div className="mx-4 mt-4 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Active Brewery</span>
        <p className="text-sm font-bold text-zinc-300 truncate">{activeBrewery?.name || breweries[0].name}</p>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-4 relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left group',
          open
            ? 'bg-white/[0.04] border-primary/20'
            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
        )}
      >
        <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {pendingId || isPending ? (
            <LucideLoader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          ) : (
            <LucideBuilding2 className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block">Active Brewery</span>
          <p className="text-sm font-bold text-zinc-300 truncate">
            {activeBrewery?.name || 'Select Brewery'}
          </p>
        </div>
        <LucideChevronDown className={cn(
          'h-3.5 w-3.5 text-zinc-600 transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Brewery list */}
          <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
            {breweries.map((brewery) => {
              const isActive = brewery.id === activeBreweryId
              const isSwitching = pendingId === brewery.id
              return (
                <button
                  key={brewery.id}
                  onClick={() => handleSwitch(brewery.id)}
                  disabled={isSwitching}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    isActive
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-white/[0.04] border border-transparent',
                    isSwitching && 'opacity-50'
                  )}
                >
                  <div className={cn(
                    'h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-white/5 text-zinc-600'
                  )}>
                    {(isPending || pendingId) && (pendingId === brewery.id || (isPending && !pendingId)) ? (
                      <LucideLoader2 className="h-3 w-3 animate-spin" />
                    ) : isActive ? (
                      <LucideCheck className="h-3 w-3" />
                    ) : (
                      brewery.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-bold truncate',
                      isActive ? 'text-primary' : 'text-zinc-400'
                    )}>
                      {brewery.name}
                    </p>
                    {brewery.license_number && (
                      <p className="text-[9px] font-mono text-zinc-700 truncate">{brewery.license_number}</p>
                    )}
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Separator */}
          <div className="border-t border-white/5" />

          {/* Add brewery */}
          <div className="p-1.5">
            {canAddBrewery ? (
              showNewForm ? (
                <form action={handleCreate} className="p-3 space-y-3">
                  <Input
                    name="name"
                    placeholder="New brewery name"
                    required
                    autoFocus
                    className="h-9 text-sm"
                  />
                  <Input
                    name="license_number"
                    placeholder="License number (optional)"
                    className="h-9 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-zinc-500"
                      onClick={() => setShowNewForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="flex-1">
                      Create
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="h-6 w-6 rounded-md bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <LucidePlus className="h-3 w-3 text-green-400" />
                  </div>
                  <p className="text-sm font-bold text-zinc-500">Add Brewery Location</p>
                </button>
              )
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                  <LucideLock className="h-3 w-3 text-zinc-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-zinc-600">Multi-Site requires the $599/mo plan</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
