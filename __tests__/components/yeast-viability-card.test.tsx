// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { YeastViabilityCard } from '@/components/YeastViabilityCard'
import type { YeastLog } from '@/types/database'

const mockLogYeastViability = vi.fn()

vi.mock('@/app/(app)/batches/[id]/actions', () => ({
  logYeastViability: (...args: unknown[]) => mockLogYeastViability(...args),
}))

const BASE: YeastLog = {
  id: 'log-1',
  batch_id: 'batch-1',
  brewery_id: 'brewery-1',
  cell_density: 200,
  viability_pct: 93,
  pitch_rate: 0.8,
  notes: null,
  logged_by: null,
  created_at: new Date('2026-04-14T10:00:00Z').toISOString(),
}

describe('YeastViabilityCard', () => {
  it('shows current log notes in the summary section when they exist', () => {
    const latestWithNotes: YeastLog = { ...BASE, notes: 'Looked healthy under scope' }
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[latestWithNotes]} />)

    expect(screen.getByText('Looked healthy under scope')).toBeInTheDocument()
  })

  it('does not render a notes element when current log has no notes', () => {
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[BASE]} />)

    expect(screen.queryByText('Looked healthy under scope')).not.toBeInTheDocument()
  })

  it('shows older log notes in history and current log notes in summary separately', () => {
    const older: YeastLog = {
      ...BASE,
      id: 'log-2',
      viability_pct: 88,
      notes: 'Previous batch note',
      created_at: new Date('2026-04-13T10:00:00Z').toISOString(),
    }
    const latest: YeastLog = { ...BASE, notes: 'Fresh observation' }
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[latest, older]} />)

    expect(screen.getByText('Fresh observation')).toBeInTheDocument()
    expect(screen.getByText('Previous batch note')).toBeInTheDocument()
  })

  it('renders the Log Viability button', () => {
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[BASE]} />)
    expect(screen.getByRole('button', { name: /log viability/i })).toBeInTheDocument()
  })

  it('renders the latest metrics (cell density, viability, pitch rate)', () => {
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[BASE]} />)
    expect(screen.getByText('200M/mL')).toBeInTheDocument()
    expect(screen.getByText('93.0%')).toBeInTheDocument()
    expect(screen.getByText('0.8 M/mL/°P')).toBeInTheDocument()
  })

  it('renders empty state when no yeast logs exist', () => {
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[]} />)
    // No metrics should be shown
    expect(screen.queryByText('200M/mL')).not.toBeInTheDocument()
    // Form should still be visible
    expect(screen.getByRole('button', { name: /log viability/i })).toBeInTheDocument()
  })

  it('submits the form and shows success status', async () => {
    mockLogYeastViability.mockResolvedValue({ success: true })

    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[BASE]} />)

    const submitBtn = screen.getByRole('button', { name: /log viability/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('✓ Logged')).toBeInTheDocument()
    })
  })

  it('shows error message on failed submission', async () => {
    mockLogYeastViability.mockResolvedValue({ success: false, error: 'DB connection failed' })

    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[BASE]} />)

    const submitBtn = screen.getByRole('button', { name: /log viability/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('DB connection failed')).toBeInTheDocument()
    })
  })

  it('shows Marginal label for viability between 70-84', () => {
    const marginal: YeastLog = { ...BASE, viability_pct: 75 }
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[marginal]} />)
    expect(screen.getByText(/Marginal/)).toBeInTheDocument()
  })

  it('shows Poor label for viability below 70', () => {
    const poor: YeastLog = { ...BASE, viability_pct: 55 }
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[poor]} />)
    expect(screen.getByText(/Poor/)).toBeInTheDocument()
  })

  it('renders history section with multiple logs', () => {
    const logs: YeastLog[] = [
      BASE,
      { ...BASE, id: 'log-2', viability_pct: 90, created_at: new Date('2026-04-13T10:00:00Z').toISOString() },
      { ...BASE, id: 'log-3', viability_pct: 85, created_at: new Date('2026-04-12T10:00:00Z').toISOString() },
    ]
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={logs} />)
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('90.0%')).toBeInTheDocument()
    expect(screen.getByText('85.0%')).toBeInTheDocument()
  })

  it('renders null cell density and pitch rate as dashes', () => {
    const noMetrics: YeastLog = { ...BASE, cell_density: null, pitch_rate: null, viability_pct: null }
    render(<YeastViabilityCard batchId="batch-1" yeastLogs={[noMetrics]} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
