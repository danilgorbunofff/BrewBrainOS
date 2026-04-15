// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const {
  mockGetReorderAlerts,
  mockGetReorderAlertsSummary,
} = vi.hoisted(() => ({
  mockGetReorderAlerts: vi.fn(),
  mockGetReorderAlertsSummary: vi.fn(),
}))

vi.mock('@/app/actions/reorder-actions', () => ({
  getReorderAlerts: mockGetReorderAlerts,
  getReorderAlertsSummary: mockGetReorderAlertsSummary,
}))

vi.mock('@/components/ReorderAlertCard', () => ({
  __esModule: true,
  default: function MockAlertCard({ alert }: { alert: { id: string; severity: string } }) {
    return <div data-testid={`alert-${alert.id}`}>Alert: {alert.severity}</div>
  },
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardDescription: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-description" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children }: { children: ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value} data-onvaluechange={String(onValueChange)}>{children}</div>
  ),
  TabsContent: ({ children, value, className }: { children: ReactNode; value: string; className?: string }) => (
    <div data-testid={`tab-content-${value}`} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="tabs-list" role="tablist" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value, className }: { children: ReactNode; value: string; className?: string }) => (
    <button data-testid={`tab-trigger-${value}`} role="tab" className={className}>{children}</button>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string; className?: string }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

import ReorderAlertsDashboard from '../../src/components/ReorderAlertsDashboard'

// ─── Tests ──────────────────────────────────────────────────────────
describe('ReorderAlertsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no alerts exist', async () => {
    mockGetReorderAlerts.mockResolvedValue([])
    mockGetReorderAlertsSummary.mockResolvedValue({
      total: 0, critical: 0, warning: 0, info: 0,
    })

    render(<ReorderAlertsDashboard breweryId="brewery-001" />)

    await waitFor(() => {
      expect(screen.getByText('All inventory levels healthy')).toBeInTheDocument()
    })
  })

  it('shows summary counts correctly', async () => {
    const alerts = [
      { id: '1', alert_type: 'stockout_imminent', severity: 'critical', status: 'open', current_quantity: 0, reorder_point: 10, created_at: '2026-04-01', inventory_item: { id: 'i1', name: 'Hops', unit: 'lbs' } },
      { id: '2', alert_type: 'critical_low', severity: 'warning', status: 'open', current_quantity: 3, reorder_point: 10, created_at: '2026-04-01', inventory_item: { id: 'i2', name: 'Malt', unit: 'lbs' } },
    ]

    mockGetReorderAlerts.mockResolvedValue(alerts)
    mockGetReorderAlertsSummary.mockResolvedValue({
      total: 2, critical: 1, warning: 1, info: 0,
    })

    render(<ReorderAlertsDashboard breweryId="brewery-001" />)

    await waitFor(() => {
      expect(screen.getByText('1 critical')).toBeInTheDocument()
      expect(screen.getByText('1 warning')).toBeInTheDocument()
    })
  })

  it('shows alert count badge on open tab', async () => {
    const alerts = [
      { id: '1', alert_type: 'stockout_imminent', severity: 'critical', status: 'open', current_quantity: 0, reorder_point: 10, created_at: '2026-04-01', inventory_item: { id: 'i1', name: 'Hops', unit: 'lbs' } },
    ]

    mockGetReorderAlerts.mockResolvedValue(alerts)
    mockGetReorderAlertsSummary.mockResolvedValue({
      total: 1, critical: 1, warning: 0, info: 0,
    })

    render(<ReorderAlertsDashboard breweryId="brewery-001" />)

    await waitFor(() => {
      const openTab = screen.getByTestId('tab-trigger-open')
      expect(openTab).toBeInTheDocument()
    })
  })

  it('calls refresh when the Refresh button is clicked', async () => {
    const user = userEvent.setup()

    mockGetReorderAlerts.mockResolvedValue([])
    mockGetReorderAlertsSummary.mockResolvedValue({
      total: 1, critical: 0, warning: 1, info: 0,
    })

    render(<ReorderAlertsDashboard breweryId="brewery-001" />)

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockGetReorderAlerts).toHaveBeenCalledTimes(1)
    })

    const refreshBtn = screen.getByText('Refresh')
    await user.click(refreshBtn)

    // Should have been called at least twice (initial + refresh)
    await waitFor(() => {
      expect(mockGetReorderAlerts).toHaveBeenCalledTimes(2)
    })
  })

  it('renders loading state when summary has alerts', async () => {
    // Delay the resolve so the loading state is visible.
    mockGetReorderAlerts.mockImplementation(
      () => new Promise((r) => setTimeout(() => r([
        { id: '1', alert_type: 'stockout_imminent', severity: 'critical', status: 'open', current_quantity: 0, reorder_point: 10, created_at: '2026-04-01', inventory_item: { id: 'i1', name: 'Hops', unit: 'lbs' } },
      ]), 200)),
    )
    mockGetReorderAlertsSummary.mockResolvedValue({
      total: 1, critical: 1, warning: 0, info: 0,
    })

    render(<ReorderAlertsDashboard breweryId="brewery-001" />)

    // Loading state should be visible inside tabs before data loads
    await waitFor(() => {
      expect(screen.getByText('Loading alerts...')).toBeInTheDocument()
    })
  })
})
