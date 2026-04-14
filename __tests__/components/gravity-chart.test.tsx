// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GravityChart, FermentationTooltip } from '../../src/components/GravityChart'

vi.mock('recharts', () => {
  const createMockComponent = (testId: string, tag: 'div' | 'g' | 'svg' = 'g') => {
    function MockComponent({ children }: { children?: ReactNode }) {
      if (tag === 'svg') return <svg data-testid={testId}>{children}</svg>
      if (tag === 'g') return <g data-testid={testId}>{children}</g>
      return <div data-testid={testId}>{children}</div>
    }
    MockComponent.displayName = testId
    return MockComponent
  }

  function ResponsiveContainer({ children }: { children?: ReactNode }) {
    return <div data-testid="responsive-container">{children}</div>
  }

  return {
    CartesianGrid: createMockComponent('cartesian-grid'),
    Line: createMockComponent('line'),
    LineChart: createMockComponent('line-chart', 'svg'),
    ResponsiveContainer,
    Tooltip: createMockComponent('tooltip'),
    XAxis: createMockComponent('x-axis'),
    YAxis: createMockComponent('y-axis'),
  }
})

const mockReadings = [
  { id: 'r1', gravity: 1.055, temperature: 18.5, created_at: '2026-04-14T08:00:00Z' },
  { id: 'r2', gravity: 1.040, temperature: 19.2, created_at: '2026-04-14T16:00:00Z' },
]

describe('GravityChart', () => {
  it('renders the chart container when there are enough readings', () => {
    render(<GravityChart readings={mockReadings} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('shows the empty state when fewer than 2 readings are provided', () => {
    render(<GravityChart readings={[mockReadings[0]]} />)
    expect(screen.getByText(/need at least 2 readings/i)).toBeInTheDocument()
  })

  it('shows the empty state when readings is empty', () => {
    render(<GravityChart readings={[]} />)
    expect(screen.getByText(/need at least 2 readings/i)).toBeInTheDocument()
  })
})

describe('FermentationTooltip', () => {
  const payload = [
    { dataKey: 'gravity', value: 1.055, color: '#f59e0b' },
    { dataKey: 'temp', value: 18.5, color: '#3b82f6' },
  ]

  it('renders gravity and temperature with distinct formatted values (string label)', () => {
    render(<FermentationTooltip active payload={payload} label="Apr 14" />)
    expect(screen.getByText('Apr 14')).toBeInTheDocument()
    expect(screen.getByText('Gravity : 1.055')).toBeInTheDocument()
    expect(screen.getByText('Temp (°F) : 18.5')).toBeInTheDocument()
  })

  it('formats a timestamp from payload into a readable date-time string', () => {
    const ts = new Date('2026-04-14T08:00:00Z').getTime()
    const payloadWithTs = payload.map(p => ({ ...p, payload: { timestamp: ts } }))
    render(<FermentationTooltip active payload={payloadWithTs} label={0} />)
    // Raw index or epoch ms must not appear — a formatted date string must
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(String(ts))).not.toBeInTheDocument()
    expect(screen.getByText('Gravity : 1.055')).toBeInTheDocument()
    expect(screen.getByText('Temp (°F) : 18.5')).toBeInTheDocument()
  })

  it('formats gravity to 3 decimal places', () => {
    render(<FermentationTooltip active payload={[{ dataKey: 'gravity', value: 1.05, color: '#f59e0b' }]} label="Apr 14" />)
    expect(screen.getByText('Gravity : 1.050')).toBeInTheDocument()
  })

  it('formats temperature to 1 decimal place', () => {
    render(<FermentationTooltip active payload={[{ dataKey: 'temp', value: 20, color: '#3b82f6' }]} label="Apr 14" />)
    expect(screen.getByText('Temp (°F) : 20.0')).toBeInTheDocument()
  })

  it('does not render when active is false', () => {
    const { container } = render(<FermentationTooltip active={false} payload={payload} label="Apr 14" />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when payload is empty', () => {
    const { container } = render(<FermentationTooltip active payload={[]} label="Apr 14" />)
    expect(container.firstChild).toBeNull()
  })

  it('does not show the expected profile line in the tooltip', () => {
    const withExpected = [
      ...payload,
      { dataKey: 'expected', value: 1.048, color: 'rgba(245,158,11,0.4)' },
    ]
    render(<FermentationTooltip active payload={withExpected} label="Apr 14" />)
    expect(screen.queryByText(/expected/i)).not.toBeInTheDocument()
    expect(screen.getByText('Gravity : 1.055')).toBeInTheDocument()
    expect(screen.getByText('Temp (°F) : 18.5')).toBeInTheDocument()
  })

  it('renders only gravity when temperature is null', () => {
    const gravityOnly = [
      { dataKey: 'gravity', value: 1.048, color: '#f59e0b' },
      { dataKey: 'temp', value: null, color: '#3b82f6' },
    ]
    render(<FermentationTooltip active payload={gravityOnly} label="Apr 14" />)
    expect(screen.getByText('Gravity : 1.048')).toBeInTheDocument()
    expect(screen.queryByText(/temp/i)).not.toBeInTheDocument()
  })

  it('renders only temperature when gravity is null', () => {
    const tempOnly = [
      { dataKey: 'gravity', value: null, color: '#f59e0b' },
      { dataKey: 'temp', value: 19.5, color: '#3b82f6' },
    ]
    render(<FermentationTooltip active payload={tempOnly} label="Apr 14" />)
    expect(screen.getByText('Temp (°F) : 19.5')).toBeInTheDocument()
    expect(screen.queryByText(/gravity/i)).not.toBeInTheDocument()
  })
})
