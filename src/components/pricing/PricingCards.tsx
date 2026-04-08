'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LucideCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PricingToggle } from '@/components/pricing/PricingToggle'
import { ScrollReveal } from '@/components/ScrollReveal'
import type { TierConfig, BillingInterval } from '@/lib/tier-config'

interface PricingCardsProps {
  tiers: TierConfig[]
}

const tierFeatures: Record<string, string[]> = {
  nano: [
    'Up to 5 tanks',
    'Inventory tracking',
    'QR tank scanning',
    'Basic compliance logs',
    'Offline-first PWA',
  ],
  production: [
    'Unlimited tanks & batches',
    'AI voice logging',
    'TTB & FSMA report exports',
    'Real-time analytics',
    'Priority support',
    'White-glove setup included',
  ],
  multi_site: [
    'Everything in Production',
    'Multi-brewery management',
    'Team roles & permissions',
    'Supply chain dashboard',
    'Dedicated account manager',
    'Custom integrations',
  ],
}

function formatPrice(price: number, interval: BillingInterval) {
  if (interval === 'annual') {
    const monthly = Math.round(price / 12)
    return { display: `$${monthly}`, period: '/mo', note: `$${price} billed annually` }
  }
  return { display: `$${price}`, period: '/mo', note: null }
}

export function PricingCards({ tiers }: PricingCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const paidTiers = tiers.filter((t) => t.price > 0)

  return (
    <div>
      <div className="flex justify-center mb-12">
        <PricingToggle interval={interval} onChange={setInterval} />
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {paidTiers.map((plan, i) => {
          const price = interval === 'annual' ? plan.annualPrice : plan.price
          const formatted = formatPrice(price, interval)
          const features = tierFeatures[plan.slug] || []
          const isPopular = plan.popular

          return (
            <ScrollReveal key={plan.slug} delay={(i + 1) * 0.1}>
              <div
                className={
                  isPopular
                    ? 'rounded-2xl border border-orange-600/30 bg-orange-600/[0.03] p-8 flex flex-col relative shadow-[0_0_60px_rgba(234,88,12,0.08)] h-full'
                    : 'rounded-2xl border border-border bg-white/[0.01] p-8 flex flex-col h-full'
                }
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-orange-600 text-foreground px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <p
                  className={`text-xs font-black uppercase tracking-widest mb-2 ${
                    isPopular ? 'text-orange-400' : 'text-muted-foreground'
                  }`}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className={`text-5xl font-black tracking-tighter ${
                      isPopular ? 'text-foreground' : ''
                    }`}
                  >
                    {formatted.display}
                  </span>
                  <span className="text-muted-foreground font-bold">{formatted.period}</span>
                </div>
                {formatted.note && (
                  <p className="text-xs text-muted-foreground font-medium mb-2">{formatted.note}</p>
                )}
                <p className="text-sm text-muted-foreground font-medium mb-8">{plan.tagline}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-center gap-2 text-sm font-medium ${
                        isPopular ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <LucideCheck
                        className={`h-4 w-4 shrink-0 ${
                          isPopular ? 'text-orange-500' : 'text-green-500'
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  {isPopular ? (
                    <Button className="w-full bg-orange-600 hover:bg-orange-500 font-bold shadow-[0_0_20px_rgba(234,88,12,0.2)]">
                      Start Free Trial
                    </Button>
                  ) : plan.slug === 'multi_site' ? (
                    <Button variant="outline" className="w-full border-border font-bold">
                      Contact Sales
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full border-border font-bold">
                      Start Free Trial
                    </Button>
                  )}
                </Link>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </div>
  )
}
