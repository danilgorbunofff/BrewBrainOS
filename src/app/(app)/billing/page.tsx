'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LucideCreditCard, LucideArrowLeft, LucideCheck, LucideSparkles,
  LucideZap, LucideShield, LucideGlobe, LucidePackageCheck, LucideAlertCircle,
} from 'lucide-react'
import { useSubscription } from '@/components/SubscriptionProvider'
import { TIERS, WHITE_GLOVE_PRICE, type TierSlug, type BillingInterval } from '@/lib/tier-config'
import { PricingToggle } from '@/components/pricing/PricingToggle'
import { cn } from '@/lib/utils'

const tierIcons: Record<TierSlug, typeof LucideZap> = {
  free: LucideSparkles,
  nano: LucideZap,
  production: LucideShield,
  multi_site: LucideGlobe,
}

const tierFeatures: Record<TierSlug, string[]> = {
  free: [
    'Up to 2 tanks',
    'Up to 3 batches/month',
    'Basic inventory tracking',
    'QR scanning',
  ],
  nano: [
    'Up to 5 tanks',
    'Up to 10 batches/month',
    'Full inventory tracking',
    'QR scanning',
    'Email support',
  ],
  production: [
    'Unlimited tanks',
    'Unlimited batches',
    'AI Voice Logging',
    'TTB Compliance Reports',
    'Full inventory tracking',
    'Priority support',
  ],
  multi_site: [
    'Everything in Production',
    'Multi-site management',
    'Regional hub controls',
    'Complex supply chain',
    'Dedicated support',
    'Custom integrations',
  ],
}

export default function BillingPage() {
  const { tier: currentTier, status, isActive, isTrial, trialExpired, tierName, whiteGlovePaid, currentPeriodEnd } = useSubscription()
  const [loading, setLoading] = useState<TierSlug | null>(null)
  const [whiteGlove, setWhiteGlove] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')

  async function handleSubscribe(tier: TierSlug) {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingInterval, includeWhiteGlove: whiteGlove }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setLoading(null)
    }
  }

  const paidTiers = TIERS.filter(t => t.price > 0)

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="border-b border-border pb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucideCreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Plans & Billing</h1>
              <p className="text-muted-foreground font-medium mt-1">Choose the plan that scales with your production.</p>
            </div>
          </div>
        </div>

        {/* Current Plan Banner */}
        {isActive && !isTrial && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LucideCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Your current plan: <span className="text-primary font-black">{tierName}</span>
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Status: <span className={cn(
                    'font-bold',
                    status === 'active' ? 'text-green-400' : status === 'past_due' ? 'text-red-400' : 'text-muted-foreground'
                  )}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  {currentPeriodEnd && (
                    <> · Renews {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {isTrial && !trialExpired && currentPeriodEnd && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <LucideZap className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  You&apos;re on a <span className="text-blue-400 font-black">14-day trial</span> of {tierName}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Trial ends {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — <span className="font-bold text-blue-400">{Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining</span>. Subscribe below to keep your features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Expired Banner */}
        {trialExpired && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <LucideAlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Your trial has <span className="text-red-400 font-black">expired</span>
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  You&apos;re now on the Free tier with limited features. Subscribe below to unlock everything you had during your trial.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center">
          <PricingToggle interval={billingInterval} onChange={setBillingInterval} />
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {paidTiers.map((plan) => {
            const Icon = tierIcons[plan.slug]
            const isCurrent = currentTier === plan.slug && isActive
            const features = tierFeatures[plan.slug] || []

            return (
              <div
                key={plan.slug}
                className={cn(
                  'relative rounded-2xl border overflow-hidden transition-all duration-300 group flex flex-col',
                  plan.popular
                    ? 'border-primary/30 bg-primary/[0.02] shadow-[0_0_40px_rgba(245,158,11,0.05)]'
                    : 'border-border bg-surface hover:border-border',
                  isCurrent && 'ring-2 ring-primary/40'
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
                    Most Popular
                  </div>
                )}

                <div className="p-6 space-y-5 flex flex-col flex-grow">
                  {/* Tier header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center',
                        plan.popular ? 'bg-primary/10 border border-primary/20' : 'bg-secondary border border-border'
                      )}>
                        <Icon className={cn(
                          'h-4.5 w-4.5',
                          plan.popular ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-foreground">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter text-foreground">
                      ${billingInterval === 'annual' ? Math.round(plan.annualPrice / 12) : plan.price}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">/mo</span>
                  </div>
                  {billingInterval === 'annual' && (
                    <p className="text-xs text-muted-foreground font-medium">${plan.annualPrice} billed annually</p>
                  )}

                  {/* Features */}
                  <ul className="space-y-2.5 flex-grow">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <LucideCheck className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          plan.popular ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleSubscribe(plan.slug)}
                    disabled={isCurrent || loading === plan.slug}
                    className={cn(
                      'w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 mt-auto',
                      isCurrent
                        ? 'bg-secondary border border-border text-muted-foreground cursor-default'
                        : plan.popular
                          ? 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                          : 'bg-secondary border border-border text-foreground hover:bg-secondary/50 hover:text-primary hover:border-primary/30',
                      (loading === plan.slug) && 'opacity-60'
                    )}
                  >
                    {isCurrent ? 'Current Plan' : loading === plan.slug ? 'Redirecting…' : 'Subscribe'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* White Glove Setup */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20 border border-primary/20 flex items-center justify-center shrink-0">
                <LucidePackageCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-foreground">White Glove Setup</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1 max-w-lg">
                  One-time ${WHITE_GLOVE_PRICE} fee. We import your Excel data, configure your facility, and ship 100 waterproof QR stickers for your tanks.
                </p>
                {whiteGlovePaid && (
                  <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest">
                    <LucideCheck className="h-3 w-3" /> Purchased
                  </span>
                )}
              </div>
            </div>
            {!whiteGlovePaid && (
              <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                <div className={cn(
                  'h-6 w-11 rounded-full transition-all duration-200 relative',
                  whiteGlove ? 'bg-primary' : 'bg-card border border-border'
                )}>
                  <div className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200',
                    whiteGlove ? 'left-[22px]' : 'left-0.5'
                  )} />
                </div>
                <input
                  type="checkbox"
                  checked={whiteGlove}
                  onChange={(e) => setWhiteGlove(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Add to subscription (+${WHITE_GLOVE_PRICE})
                </span>
              </label>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 space-y-4">
          <h3 className="text-lg font-black tracking-tight text-foreground">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes. Upgrades take effect immediately, downgrades at the end of your billing cycle.',
              },
              {
                q: 'What happens when I cancel?',
                a: 'You keep access until the end of your paid period, then revert to the Free tier limits.',
              },
              {
                q: 'Is the White Glove fee refundable?',
                a: 'No, since it includes shipped QR materials and hands-on data migration.',
              },
              {
                q: 'Do you offer a free trial?',
                a: 'Yes! New accounts get a 14-day free trial of a paid plan — no credit card required. After the trial, you can subscribe or continue on the Free tier.',
              },
            ].map((faq) => (
              <div key={faq.q} className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-sm font-bold text-foreground">{faq.q}</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
