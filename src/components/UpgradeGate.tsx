'use client'

import Link from 'next/link'
import { LucideLock, LucideSparkles } from 'lucide-react'
import { useSubscription } from '@/components/SubscriptionProvider'
import type { TierSlug } from '@/lib/tier-config'

const TIER_RANK: Record<TierSlug, number> = {
  free: 0,
  nano: 1,
  production: 2,
  multi_site: 3,
}

interface UpgradeGateProps {
  /** Minimum tier required to see child content */
  requiredTier: TierSlug
  /** Feature name shown in the lock overlay */
  featureName: string
  children: React.ReactNode
  /** Optional: render nothing instead of the lock overlay */
  hideCompletely?: boolean
}

/**
 * Wraps content that requires a specific subscription tier.
 * If the user's tier is insufficient, shows a premium lock overlay.
 */
export function UpgradeGate({
  requiredTier,
  featureName,
  children,
  hideCompletely = false,
}: UpgradeGateProps) {
  const { tier } = useSubscription()

  const userRank = TIER_RANK[tier] ?? 0
  const requiredRank = TIER_RANK[requiredTier] ?? 0

  if (userRank >= requiredRank) {
    return <>{children}</>
  }

  if (hideCompletely) return null

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred child content preview */}
      <div className="blur-sm pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#060606]/60 backdrop-blur-md rounded-2xl z-10">
        <div className="text-center space-y-4 max-w-xs px-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <LucideLock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground tracking-tight">
              {featureName}
            </h3>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              This feature requires the{' '}
              <span className="text-primary font-bold capitalize">
                {requiredTier.replace('_', '-')}
              </span>{' '}
              plan or higher.
            </p>
          </div>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <LucideSparkles className="h-4 w-4" />
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to check if the user has at least a given tier.
 */
export function useTierCheck(requiredTier: TierSlug): boolean {
  const { tier } = useSubscription()
  return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0)
}
