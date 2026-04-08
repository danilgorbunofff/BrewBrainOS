'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { TierSlug, TierLimits } from '@/lib/tier-config'
import { getTierLimits, getTierBySlug } from '@/lib/tier-config'

export interface SubscriptionData {
  tier: TierSlug
  tierName: string
  status: string        // 'active' | 'past_due' | 'canceled' | 'inactive' | 'trialing'
  isActive: boolean     // status is 'active' or 'trialing' (and trial not expired)
  isTrial: boolean      // currently in a trial period
  trialExpired: boolean // trial period has ended without conversion
  limits: TierLimits
  whiteGlovePaid: boolean
  currentPeriodEnd: string | null
}

const SubscriptionContext = createContext<SubscriptionData>({
  tier: 'free',
  tierName: 'Free',
  status: 'inactive',
  isActive: false,
  isTrial: false,
  trialExpired: false,
  limits: getTierLimits('free'),
  whiteGlovePaid: false,
  currentPeriodEnd: null,
})

interface SubscriptionProviderProps {
  children: ReactNode
  subscription: {
    tier: TierSlug
    status: string
    white_glove_paid: boolean
    current_period_end: string | null
  } | null
}

export function SubscriptionProvider({ children, subscription }: SubscriptionProviderProps) {
  const tier = subscription?.tier || 'free'
  const status = subscription?.status || 'inactive'
  const periodEnd = subscription?.current_period_end || null

  // Detect trial state and expiration
  const isTrial = status === 'trialing'
  const trialExpired = isTrial && !!periodEnd && new Date(periodEnd) < new Date()

  // Active means paid active OR trialing with time remaining
  const isActive = status === 'active' || (isTrial && !trialExpired)

  // If trial expired, fall back to free limits
  const effectiveTier = trialExpired ? 'free' : tier

  const value: SubscriptionData = {
    tier: effectiveTier,
    tierName: trialExpired ? 'Free' : getTierBySlug(tier).name,
    status: trialExpired ? 'inactive' : status,
    isActive,
    isTrial,
    trialExpired,
    limits: getTierLimits(effectiveTier),
    whiteGlovePaid: subscription?.white_glove_paid || false,
    currentPeriodEnd: periodEnd,
  }

  return (
    <SubscriptionContext value={value}>
      {children}
    </SubscriptionContext>
  )
}

export function useSubscription(): SubscriptionData {
  return useContext(SubscriptionContext)
}
