'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideCreditCard, LucideArrowRight, LucideCheck, LucideAlertCircle } from 'lucide-react'
import { useSubscription } from '@/components/SubscriptionProvider'
import { cn } from '@/lib/utils'

/**
 * Subscription status card for the Settings page.
 */
export function SubscriptionCard() {
  const { tier, tierName, status, isActive, isTrial, trialExpired, currentPeriodEnd, whiteGlovePaid } = useSubscription()

  const [now] = useState(() => Date.now())

  const statusBadge = {
    active: { label: 'Active', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    trialing: { label: 'Trial', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    past_due: { label: 'Past Due', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    canceled: { label: 'Canceled', color: 'text-muted-foreground bg-secondary border-border' },
    inactive: { label: 'No Plan', color: 'text-muted-foreground bg-surface border-border' },
  }[status] || { label: status, color: 'text-muted-foreground bg-secondary border-border' }

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <LucideCreditCard className="h-5 w-5 text-primary/60" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Plan */}
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Plan</p>
              <p className="text-2xl font-black tracking-tight text-foreground mt-0.5">{tierName}</p>
            </div>
            <span className={cn(
              'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
              statusBadge.color
            )}>
              {statusBadge.label}
            </span>
          </div>

          {/* Period info */}
          {isActive && !isTrial && currentPeriodEnd && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LucideCheck className="h-3.5 w-3.5 text-green-400" />
              <span className="font-medium">
                Renews {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Trial info */}
          {isTrial && !trialExpired && currentPeriodEnd && (
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <LucideCheck className="h-3.5 w-3.5" />
              <span className="font-bold">
                Trial ends {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })} — {Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - now) / (1000 * 60 * 60 * 24)))} days remaining
              </span>
            </div>
          )}

          {trialExpired && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <LucideAlertCircle className="h-3.5 w-3.5" />
              <span className="font-bold">Your trial has expired. Subscribe to keep your features.</span>
            </div>
          )}

          {status === 'past_due' && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <LucideAlertCircle className="h-3.5 w-3.5" />
              <span className="font-bold">Payment failed. Please update your billing info.</span>
            </div>
          )}

          {/* White Glove */}
          {whiteGlovePaid && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LucideCheck className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">White Glove Setup included</span>
            </div>
          )}
        </div>

        {/* Manage link */}
        <Link
          href="/billing"
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface border border-border hover:bg-secondary hover:border-primary/20 transition-all group"
        >
          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
            {tier === 'free' ? 'View Plans & Upgrade' : 'Manage Subscription'}
          </span>
          <LucideArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </CardContent>
    </Card>
  )
}
