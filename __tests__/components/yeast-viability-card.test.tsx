// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { YeastViabilityCard } from '@/components/YeastViabilityCard'
import type { YeastLog } from '@/types/database'

vi.mock('@/app/(app)/batches/[id]/actions', () => ({
  logYeastViability: vi.fn(),
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
})
