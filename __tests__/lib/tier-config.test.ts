// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  TIERS,
  getTierBySlug,
  getTierLimits,
  canUseTierFeature,
  getStripePriceId,
  getTierPrice,
  getWhiteGlovePriceId,
  WHITE_GLOVE_PRICE,
} from '@/lib/tier-config'

describe('tier-config', () => {
  it('defines 4 tiers in correct order', () => {
    expect(TIERS).toHaveLength(4)
    expect(TIERS.map(t => t.slug)).toEqual(['free', 'nano', 'production', 'multi_site'])
  })

  it('WHITE_GLOVE_PRICE is defined', () => {
    expect(WHITE_GLOVE_PRICE).toBe(750)
  })

  describe('getTierBySlug', () => {
    it('returns the correct tier for each slug', () => {
      expect(getTierBySlug('free').name).toBe('Free')
      expect(getTierBySlug('nano').name).toBe('Nanobrewery')
      expect(getTierBySlug('production').name).toBe('Production')
      expect(getTierBySlug('multi_site').name).toBe('Multi-Site')
    })

    it('falls back to free tier for unknown slug', () => {
      expect(getTierBySlug('unknown' as never).slug).toBe('free')
    })
  })

  describe('getTierLimits', () => {
    it('free tier has strict limits', () => {
      const limits = getTierLimits('free')
      expect(limits.maxTanks).toBe(2)
      expect(limits.maxBatchesPerMonth).toBe(3)
      expect(limits.aiVoiceLogs).toBe(false)
      expect(limits.ttbReports).toBe(false)
      expect(limits.multiSite).toBe(false)
    })

    it('production tier has unlimited tanks', () => {
      const limits = getTierLimits('production')
      expect(limits.maxTanks).toBe(-1)
      expect(limits.maxBatchesPerMonth).toBe(-1)
      expect(limits.aiVoiceLogs).toBe(true)
      expect(limits.ttbReports).toBe(true)
    })

    it('multi_site tier has all features', () => {
      const limits = getTierLimits('multi_site')
      expect(limits.multiSite).toBe(true)
    })
  })

  describe('canUseTierFeature', () => {
    it('free tier cannot use aiVoiceLogs', () => {
      expect(canUseTierFeature('free', 'aiVoiceLogs')).toBe(false)
    })

    it('production tier can use aiVoiceLogs', () => {
      expect(canUseTierFeature('production', 'aiVoiceLogs')).toBe(true)
    })

    it('free tier can use maxTanks (limit > 0)', () => {
      expect(canUseTierFeature('free', 'maxTanks')).toBe(true)
    })

    it('production tier unlimited tanks (-1) returns true', () => {
      expect(canUseTierFeature('production', 'maxTanks')).toBe(true)
    })

    it('free tier cannot use ttbReports', () => {
      expect(canUseTierFeature('free', 'ttbReports')).toBe(false)
    })

    it('multi_site tier can use multiSite', () => {
      expect(canUseTierFeature('multi_site', 'multiSite')).toBe(true)
    })
  })

  describe('getStripePriceId', () => {
    it('returns null for free tier', () => {
      expect(getStripePriceId('free')).toBeNull()
      expect(getStripePriceId('free', 'annual')).toBeNull()
    })

    it('returns null when env is unset (default)', () => {
      // env vars are not set in test
      expect(getStripePriceId('nano')).toBeNull()
      expect(getStripePriceId('nano', 'annual')).toBeNull()
      expect(getStripePriceId('production')).toBeNull()
      expect(getStripePriceId('production', 'annual')).toBeNull()
      expect(getStripePriceId('multi_site')).toBeNull()
      expect(getStripePriceId('multi_site', 'annual')).toBeNull()
    })
  })

  describe('getTierPrice', () => {
    it('returns monthly price by default', () => {
      const tier = TIERS.find(t => t.slug === 'nano')!
      expect(getTierPrice(tier, 'monthly')).toBe(149)
    })

    it('returns annual price', () => {
      const tier = TIERS.find(t => t.slug === 'nano')!
      expect(getTierPrice(tier, 'annual')).toBe(1428)
    })

    it('free tier is 0 for both intervals', () => {
      const tier = TIERS.find(t => t.slug === 'free')!
      expect(getTierPrice(tier, 'monthly')).toBe(0)
      expect(getTierPrice(tier, 'annual')).toBe(0)
    })
  })

  describe('getWhiteGlovePriceId', () => {
    it('returns null when env is unset', () => {
      expect(getWhiteGlovePriceId()).toBeNull()
    })
  })
})
