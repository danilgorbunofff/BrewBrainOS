'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LucideCreditCard, LucideArrowLeft, LucideCheck, LucideSparkles,
  LucideZap, LucideShield, LucideGlobe, LucidePackageCheck,
} from 'lucide-react'
import { useSubscription } from '@/components/SubscriptionProvider'
import { TIERS, WHITE_GLOVE_PRICE, type TierSlug } from '@/lib/tier-config'
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
  const { tier: currentTier, status, isActive, tierName, whiteGlovePaid, currentPeriodEnd } = useSubscription()
  const [loading, setLoading] = useState<TierSlug | null>(null)
  const [whiteGlove, setWhiteGlove] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  async function handleSubscribe(tier: TierSlug) {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, includeWhiteGlove: whiteGlove }),
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

  async function handleManage() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Portal failed:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  const paidTiers = TIERS.filter(t => t.price > 0)

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="border-b border-white/5 pb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucideCreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white">Plans & Billing</h1>
              <p className="text-zinc-500 font-medium mt-1">Choose the plan that scales with your production.</p>
            </div>
          </div>
        </div>

        {/* Current Plan Banner */}
        {isActive && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LucideCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-300">
                  Your current plan: <span className="text-primary font-black">{tierName}</span>
                </p>
                <p className="text-xs text-zinc-600 font-medium mt-0.5">
                  Status: <span className={cn(
                    'font-bold',
                    status === 'active' ? 'text-green-400' : status === 'past_due' ? 'text-red-400' : 'text-zinc-500'
                  )}>{status}</span>
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
            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
            >
              {portalLoading ? 'Loading…' : 'Manage Subscription'}
            </button>
          </div>
        )}

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
                  'relative rounded-2xl border overflow-hidden transition-all duration-300 group',
                  plan.popular
                    ? 'border-primary/30 bg-primary/[0.02] shadow-[0_0_40px_rgba(245,158,11,0.05)]'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/10',
                  isCurrent && 'ring-2 ring-primary/40'
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
                    Most Popular
                  </div>
                )}

                <div className="p-6 space-y-5">
                  {/* Tier header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center',
                        plan.popular ? 'bg-primary/10 border border-primary/20' : 'bg-white/5 border border-white/5'
                      )}>
                        <Icon className={cn(
                          'h-4.5 w-4.5',
                          plan.popular ? 'text-primary' : 'text-zinc-500'
                        )} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-white">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter text-white">${plan.price}</span>
                    <span className="text-sm font-bold text-zinc-600">/mo</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-zinc-400">
                        <LucideCheck className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          plan.popular ? 'text-primary' : 'text-zinc-600'
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
                      'w-full py-3 rounded-xl text-sm font-bold transition-all duration-200',
                      isCurrent
                        ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-default'
                        : plan.popular
                          ? 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                          : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white',
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
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20 border border-primary/20 flex items-center justify-center shrink-0">
                <LucidePackageCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">White Glove Setup</h3>
                <p className="text-sm text-zinc-500 font-medium mt-1 max-w-lg">
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
                  whiteGlove ? 'bg-primary' : 'bg-zinc-800 border border-white/10'
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
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">
                  Add to subscription (+${WHITE_GLOVE_PRICE})
                </span>
              </label>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 md:p-8 space-y-4">
          <h3 className="text-lg font-black tracking-tight text-white">Frequently Asked Questions</h3>
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
                a: 'All new accounts start on the Free tier with full access to core features, limited only in scale.',
              },
            ].map((faq) => (
              <div key={faq.q} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-sm font-bold text-zinc-300">{faq.q}</p>
                <p className="text-xs text-zinc-600 font-medium mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
