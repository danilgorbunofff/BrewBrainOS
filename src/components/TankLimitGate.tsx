'use client'

import { useSubscription } from '@/components/SubscriptionProvider'
import Link from 'next/link'
import { LucideLock, LucideSparkles } from 'lucide-react'

interface TankLimitBadgeProps {
  currentCount: number
}

/**
 * Shows tank usage (X/Y) and gates the Add Tank form if at limit.
 */
export function TankLimitBadge({ currentCount }: TankLimitBadgeProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { limits, tier } = useSubscription()
  const maxTanks = limits.maxTanks
  const isUnlimited = maxTanks === -1
  const atLimit = !isUnlimited && currentCount >= maxTanks

  return (
    <div className="flex items-center gap-3">
      {/* Usage badge */}
      <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
        atLimit
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : 'bg-surface-hover border-border text-muted-foreground'
      }`}>
        {isUnlimited ? `${currentCount} Tanks` : `${currentCount}/${maxTanks} Tanks`}
      </div>

      {/* Upgrade CTA when at limit */}
      {atLimit && (
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
        >
          <LucideSparkles className="h-3 w-3" />
          Upgrade
        </Link>
      )}
    </div>
  )
}

/**
 * Wrapper that hides the Add Tank form if at tier limit.
 */
export function TankAddGate({ currentCount, children }: { currentCount: number; children: React.ReactNode }) {
  const { limits } = useSubscription()
  const maxTanks = limits.maxTanks
  const isUnlimited = maxTanks === -1
  const atLimit = !isUnlimited && currentCount >= maxTanks

  if (atLimit) {
    return (
      <div className="relative group">
        <div className="px-4 py-2.5 rounded-xl bg-surface border border-border flex items-center gap-2 text-muted-foreground">
          <LucideLock className="h-4 w-4" />
          <span className="text-xs font-bold">Tank limit reached</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
