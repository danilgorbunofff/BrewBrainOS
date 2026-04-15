// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockGetShrinkageAlerts,
  mockGetShrinkageStats,
} = vi.hoisted(() => ({
  mockGetShrinkageAlerts: vi.fn(),
  mockGetShrinkageStats: vi.fn(),
}))

vi.mock('@/app/actions/shrinkage', () => ({
  getShrinkageAlerts: mockGetShrinkageAlerts,
  getShrinkageStats: mockGetShrinkageStats,
}))

vi.mock('@/components/ShrinkageAlertCard', () => ({
  ShrinkageAlertsContainer: function MockContainer({
    alerts,
    isLoading,
  }: {
    alerts: unknown[]
    isLoading: boolean
  }) {
    if (isLoading) return <div data-testid="loading">Loading...</div>
    if (alerts.length === 0)
      return <div data-testid="empty-alerts">No alerts</div>
    return (
      <div data-testid="alerts-list">
        {alerts.map((_, i) => (
          <div key={i} data-testid={`alert-${i}`}>
            Alert
          </div>
        ))}
      </div>
    )
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ShrinkageDashboard } from '../../src/components/ShrinkageDashboard'

// ─── Helpers ────────────────────────────────────────────────────────
function createDefaultStats() {
  return {
    total_alerts: 0,
    critical_alerts: 0,
    this_month_loss: 0,
    average_monthly_loss: 0,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('ShrinkageDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with empty state when no alerts exist', async () => {
    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: [] })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: createDefaultStats(),
    })

    render(<ShrinkageDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-alerts')).toBeInTheDocument()
    })
  })

  it('renders stats cards with correct values', async () => {
    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: [] })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: {
        total_alerts: 5,
        critical_alerts: 2,
        this_month_loss: 12.5,
        average_monthly_loss: 8.3,
      },
    })

    render(<ShrinkageDashboard showStats />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('12.5 units')).toBeInTheDocument()
      expect(screen.getByText('8.3 units')).toBeInTheDocument()
    })
  })

  it('shows alerts when they exist', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        inventory_id: 'inv-1',
        severity: 'critical',
        status: 'unresolved',
        alert_type: 'sudden_spike',
      },
      {
        id: 'alert-2',
        inventory_id: 'inv-2',
        severity: 'medium',
        status: 'unresolved',
        alert_type: 'pattern_degradation',
      },
    ]

    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: mockAlerts })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: createDefaultStats(),
    })

    render(<ShrinkageDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('alerts-list')).toBeInTheDocument()
      expect(screen.getByTestId('alert-0')).toBeInTheDocument()
      expect(screen.getByTestId('alert-1')).toBeInTheDocument()
    })
  })

  it('limits alerts displayed to maxAlerts', async () => {
    const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
      id: `alert-${i}`,
      inventory_id: `inv-${i}`,
      severity: 'medium',
      status: 'unresolved',
      alert_type: 'unusual_single_loss',
    }))

    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: manyAlerts })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: createDefaultStats(),
    })

    render(<ShrinkageDashboard maxAlerts={3} />)

    await waitFor(() => {
      const list = screen.getByTestId('alerts-list')
      expect(list.children).toHaveLength(3)
    })
  })

  it('refresh button re-fetches data', async () => {
    const user = userEvent.setup()

    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: [] })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: createDefaultStats(),
    })

    render(<ShrinkageDashboard />)

    await waitFor(() => {
      expect(mockGetShrinkageAlerts).toHaveBeenCalledTimes(1)
    })

    const refreshBtn = screen.getByRole('button', { name: /refresh alerts/i })
    await user.click(refreshBtn)

    await waitFor(() => {
      expect(mockGetShrinkageAlerts).toHaveBeenCalledTimes(2)
    })
  })

  it('renders educational info section', async () => {
    mockGetShrinkageAlerts.mockResolvedValue({ success: true, data: [] })
    mockGetShrinkageStats.mockResolvedValue({
      success: true,
      data: createDefaultStats(),
    })

    render(<ShrinkageDashboard />)

    await waitFor(() => {
      expect(screen.getByText('How Shrinkage Detection Works')).toBeInTheDocument()
    })
  })
})
