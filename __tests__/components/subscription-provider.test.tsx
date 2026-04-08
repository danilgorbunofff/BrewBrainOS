// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionProvider, useSubscription } from '@/components/SubscriptionProvider'

function SubscriptionDebug() {
  const sub = useSubscription()
  return (
    <div>
      <span data-testid="tier">{sub.tier}</span>
      <span data-testid="tierName">{sub.tierName}</span>
      <span data-testid="status">{sub.status}</span>
      <span data-testid="isActive">{String(sub.isActive)}</span>
      <span data-testid="isTrial">{String(sub.isTrial)}</span>
      <span data-testid="trialExpired">{String(sub.trialExpired)}</span>
    </div>
  )
}

describe('SubscriptionProvider', () => {
  it('defaults to free/inactive when no subscription', () => {
    render(
      <SubscriptionProvider subscription={null}>
        <SubscriptionDebug />
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('tier')).toHaveTextContent('free')
    expect(screen.getByTestId('status')).toHaveTextContent('inactive')
    expect(screen.getByTestId('isActive')).toHaveTextContent('false')
    expect(screen.getByTestId('isTrial')).toHaveTextContent('false')
    expect(screen.getByTestId('trialExpired')).toHaveTextContent('false')
  })

  it('reports active for a paid active subscription', () => {
    render(
      <SubscriptionProvider subscription={{
        tier: 'production',
        status: 'active',
        white_glove_paid: false,
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }}>
        <SubscriptionDebug />
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('tier')).toHaveTextContent('production')
    expect(screen.getByTestId('status')).toHaveTextContent('active')
    expect(screen.getByTestId('isActive')).toHaveTextContent('true')
    expect(screen.getByTestId('isTrial')).toHaveTextContent('false')
    expect(screen.getByTestId('trialExpired')).toHaveTextContent('false')
  })

  it('reports active trial when trialing and period has not ended', () => {
    const futureEnd = new Date(Date.now() + 7 * 86400000).toISOString()
    render(
      <SubscriptionProvider subscription={{
        tier: 'production',
        status: 'trialing',
        white_glove_paid: false,
        current_period_end: futureEnd,
      }}>
        <SubscriptionDebug />
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('tier')).toHaveTextContent('production')
    expect(screen.getByTestId('tierName')).toHaveTextContent('Production')
    expect(screen.getByTestId('status')).toHaveTextContent('trialing')
    expect(screen.getByTestId('isActive')).toHaveTextContent('true')
    expect(screen.getByTestId('isTrial')).toHaveTextContent('true')
    expect(screen.getByTestId('trialExpired')).toHaveTextContent('false')
  })

  it('reverts to free when trial has expired', () => {
    const pastEnd = new Date(Date.now() - 1 * 86400000).toISOString()
    render(
      <SubscriptionProvider subscription={{
        tier: 'production',
        status: 'trialing',
        white_glove_paid: false,
        current_period_end: pastEnd,
      }}>
        <SubscriptionDebug />
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('tier')).toHaveTextContent('free')
    expect(screen.getByTestId('tierName')).toHaveTextContent('Free')
    expect(screen.getByTestId('status')).toHaveTextContent('inactive')
    expect(screen.getByTestId('isActive')).toHaveTextContent('false')
    expect(screen.getByTestId('isTrial')).toHaveTextContent('true')
    expect(screen.getByTestId('trialExpired')).toHaveTextContent('true')
  })

  it('reports nano trial correctly', () => {
    const futureEnd = new Date(Date.now() + 14 * 86400000).toISOString()
    render(
      <SubscriptionProvider subscription={{
        tier: 'nano',
        status: 'trialing',
        white_glove_paid: false,
        current_period_end: futureEnd,
      }}>
        <SubscriptionDebug />
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('tier')).toHaveTextContent('nano')
    expect(screen.getByTestId('tierName')).toHaveTextContent('Nanobrewery')
    expect(screen.getByTestId('isActive')).toHaveTextContent('true')
    expect(screen.getByTestId('isTrial')).toHaveTextContent('true')
    expect(screen.getByTestId('trialExpired')).toHaveTextContent('false')
  })
})
