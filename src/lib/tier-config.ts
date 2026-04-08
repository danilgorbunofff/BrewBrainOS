/**
 * BrewBrain OS — Subscription Tier Configuration
 * Single source of truth for tier names, limits, and Stripe price IDs.
 */

import { TierSlug } from '@/types/database'
export type { TierSlug }

export type BillingInterval = 'monthly' | 'annual'

export interface TierLimits {
  maxTanks: number        // -1 = unlimited
  maxBatchesPerMonth: number // -1 = unlimited
  aiVoiceLogs: boolean
  ttbReports: boolean
  multiSite: boolean
}

export interface TierConfig {
  slug: TierSlug
  name: string
  tagline: string
  price: number           // monthly USD, 0 = free
  annualPrice: number     // annual USD, 0 = free
  limits: TierLimits
  popular?: boolean
}

export const TIERS: TierConfig[] = [
  {
    slug: 'free',
    name: 'Free',
    tagline: 'Explore BrewBrain with basic limits',
    price: 0,
    annualPrice: 0,
    limits: {
      maxTanks: 2,
      maxBatchesPerMonth: 3,
      aiVoiceLogs: false,
      ttbReports: false,
      multiSite: false,
    },
  },
  {
    slug: 'nano',
    name: 'Nanobrewery',
    tagline: 'For small-batch and homebrew-scale operations',
    price: 149,
    annualPrice: 1428,
    limits: {
      maxTanks: 5,
      maxBatchesPerMonth: 10,
      aiVoiceLogs: false,
      ttbReports: false,
      multiSite: false,
    },
  },
  {
    slug: 'production',
    name: 'Production',
    tagline: 'AI voice logs, TTB reports & unlimited tanks',
    price: 299,
    annualPrice: 2868,
    popular: true,
    limits: {
      maxTanks: -1,
      maxBatchesPerMonth: -1,
      aiVoiceLogs: true,
      ttbReports: true,
      multiSite: false,
    },
  },
  {
    slug: 'multi_site',
    name: 'Multi-Site',
    tagline: 'Regional hubs, complex supply chain, everything',
    price: 599,
    annualPrice: 5748,
    limits: {
      maxTanks: -1,
      maxBatchesPerMonth: -1,
      aiVoiceLogs: true,
      ttbReports: true,
      multiSite: true,
    },
  },
]

export const WHITE_GLOVE_PRICE = 750 // one-time setup fee

/** Look up a tier by slug */
export function getTierBySlug(slug: TierSlug): TierConfig {
  return TIERS.find((t) => t.slug === slug) || TIERS[0]
}

/** Get limits for a tier slug */
export function getTierLimits(slug: TierSlug): TierLimits {
  return getTierBySlug(slug).limits
}

/** Check if a specific feature is allowed on a given tier */
export function canUseTierFeature(
  tier: TierSlug,
  feature: keyof TierLimits
): boolean {
  const limits = getTierLimits(tier)
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  // For numeric limits, "allowed" means limit > 0 or unlimited (-1)
  return value === -1 || value > 0
}

/** Stripe price IDs — loaded from env at runtime */
export function getStripePriceId(tier: TierSlug, interval: BillingInterval = 'monthly'): string | null {
  if (interval === 'annual') {
    switch (tier) {
      case 'nano':
        return process.env.STRIPE_PRICE_NANO_ANNUAL || null
      case 'production':
        return process.env.STRIPE_PRICE_PRODUCTION_ANNUAL || null
      case 'multi_site':
        return process.env.STRIPE_PRICE_MULTI_SITE_ANNUAL || null
      default:
        return null
    }
  }
  switch (tier) {
    case 'nano':
      return process.env.STRIPE_PRICE_NANO || null
    case 'production':
      return process.env.STRIPE_PRICE_PRODUCTION || null
    case 'multi_site':
      return process.env.STRIPE_PRICE_MULTI_SITE || null
    default:
      return null
  }
}

/** Get the display price for a tier and interval */
export function getTierPrice(tier: TierConfig, interval: BillingInterval): number {
  return interval === 'annual' ? tier.annualPrice : tier.price
}

export function getWhiteGlovePriceId(): string | null {
  return process.env.STRIPE_PRICE_WHITE_GLOVE || null
}
