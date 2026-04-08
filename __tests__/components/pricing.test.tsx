// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PricingToggle } from '@/components/pricing/PricingToggle'
import { PricingCards } from '@/components/pricing/PricingCards'
import { TIERS } from '@/lib/tier-config'

beforeAll(() => {
  // framer-motion viewport detection needs IntersectionObserver
  globalThis.IntersectionObserver = class IntersectionObserverStub {
    constructor(private callback: IntersectionObserverCallback) {}
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = [0]
    observe(target: Element) {
      // Immediately report as intersecting so ScrollReveal renders children
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
  } as unknown as typeof IntersectionObserver
})

describe('PricingToggle', () => {
  it('renders monthly and annual options', () => {
    render(<PricingToggle interval="monthly" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: /monthly/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /annual/i })).toBeInTheDocument()
  })

  it('marks the selected interval as checked', () => {
    render(<PricingToggle interval="annual" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: /annual/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /monthly/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange when toggling', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PricingToggle interval="monthly" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /annual/i }))
    expect(onChange).toHaveBeenCalledWith('annual')
  })
})

describe('PricingCards', () => {
  it('renders paid tier cards with monthly prices by default', () => {
    render(<PricingCards tiers={TIERS} />)
    expect(screen.getByText('$149')).toBeInTheDocument()
    expect(screen.getByText('$299')).toBeInTheDocument()
    expect(screen.getByText('$599')).toBeInTheDocument()
  })

  it('switches to annual prices when toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<PricingCards tiers={TIERS} />)

    await user.click(screen.getByRole('radio', { name: /annual/i }))

    // Annual shows per-month price ($1428/12 = $119, $2868/12 = $239, $5748/12 = $479)
    expect(screen.getByText('$119')).toBeInTheDocument()
    expect(screen.getByText('$239')).toBeInTheDocument()
    expect(screen.getByText('$479')).toBeInTheDocument()

    // Shows annual total in note
    expect(screen.getByText('$1428 billed annually')).toBeInTheDocument()
    expect(screen.getByText('$2868 billed annually')).toBeInTheDocument()
    expect(screen.getByText('$5748 billed annually')).toBeInTheDocument()
  })

  it('shows "Most Popular" badge for the production tier', () => {
    render(<PricingCards tiers={TIERS} />)
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('does not render the free tier', () => {
    render(<PricingCards tiers={TIERS} />)
    expect(screen.queryByText('Free')).not.toBeInTheDocument()
  })
})
