'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { TierSlug, TierLimits } from '@/lib/tier-config'
import { getTierLimits, getTierBySlug } from '@/lib/tier-config'

export interface SubscriptionData {
  tier: TierSlug
  tierName: string
  status: string        // 'active' | 'past_due' | 'canceled' | 'inactive' | 'trialing'
  isActive: boolean     // status is 'active' or 'trialing'
  limits: TierLimits
  whiteGlovePaid: boolean
  currentPeriodEnd: string | null
}

const SubscriptionContext = createContext<SubscriptionData>({
  tier: 'free',
  tierName: 'Free',
  status: 'inactive',
  isActive: false,
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
  const isActive = status === 'active' || status === 'trialing'

  const value: SubscriptionData = {
    tier,
    tierName: getTierBySlug(tier).name,
    status,
    isActive,
    limits: getTierLimits(tier),
    whiteGlovePaid: subscription?.white_glove_paid || false,
    currentPeriodEnd: subscription?.current_period_end || null,
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
