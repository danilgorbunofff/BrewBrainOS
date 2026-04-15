// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockUseSubscription } = vi.hoisted(() => ({
  mockUseSubscription: vi.fn(),
}))

vi.mock('@/components/SubscriptionProvider', () => ({
  useSubscription: mockUseSubscription,
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('lucide-react', () => ({
  LucideLock: () => <span data-testid="lock-icon" />,
  LucideSparkles: () => <span data-testid="sparkles-icon" />,
}))

import { ReportsGate } from '@/components/ReportsGate'

// ─── Tests ──────────────────────────────────────────────────────────
describe('ReportsGate', () => {
  it('renders children when tier is production', () => {
    mockUseSubscription.mockReturnValue({ tier: 'production' })

    render(
      <ReportsGate>
        <div data-testid="report-content">Report Content</div>
      </ReportsGate>
    )

    expect(screen.getByTestId('report-content')).toBeInTheDocument()
  })

  it('renders children when tier is multi_site', () => {
    mockUseSubscription.mockReturnValue({ tier: 'multi_site' })

    render(
      <ReportsGate>
        <div data-testid="report-content">Report Content</div>
      </ReportsGate>
    )

    expect(screen.getByTestId('report-content')).toBeInTheDocument()
  })

  it('shows upgrade message when tier is free', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free' })

    render(
      <ReportsGate>
        <div data-testid="report-content">Report Content</div>
      </ReportsGate>
    )

    // The report content should not be directly accessible (blurred behind upgrade overlay)
    expect(screen.queryByTestId('report-content')).toBeInTheDocument()
    // The upgrade overlay should be visible
    expect(screen.getByText(/TTB Compliance Reports/i)).toBeInTheDocument()
  })

  it('shows upgrade message when tier is nano', () => {
    mockUseSubscription.mockReturnValue({ tier: 'nano' })

    render(
      <ReportsGate>
        <div data-testid="report-content">Report Content</div>
      </ReportsGate>
    )

    // Upgrade gate should render the lock overlay
    expect(screen.getByText(/TTB Compliance Reports/i)).toBeInTheDocument()
  })
})
