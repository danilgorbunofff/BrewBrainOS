'use client'

import type { BillingInterval } from '@/lib/tier-config'
import { cn } from '@/lib/utils'

interface PricingToggleProps {
  interval: BillingInterval
  onChange: (interval: BillingInterval) => void
}

export function PricingToggle({ interval, onChange }: PricingToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className="inline-flex items-center rounded-full border border-border bg-card p-1"
    >
      <button
        type="button"
        role="radio"
        aria-checked={interval === 'monthly'}
        onClick={() => onChange('monthly')}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-bold transition-all duration-200',
          interval === 'monthly'
            ? 'bg-orange-600 text-white shadow-[0_0_16px_rgba(234,88,12,0.25)]'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={interval === 'annual'}
        onClick={() => onChange('annual')}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 flex items-center gap-2',
          interval === 'annual'
            ? 'bg-orange-600 text-white shadow-[0_0_16px_rgba(234,88,12,0.25)]'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Annual
        <span className={cn(
          'text-[10px] font-black uppercase tracking-wide rounded-full px-2 py-0.5',
          interval === 'annual'
            ? 'bg-white/20 text-white'
            : 'bg-green-500/10 text-green-400 border border-green-500/20'
        )}>
          Save 20%
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {interval === 'annual' ? 'Annual billing selected — save 20%' : 'Monthly billing selected'}
      </span>
    </div>
  )
}
