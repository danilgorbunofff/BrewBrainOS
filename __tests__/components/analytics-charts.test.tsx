// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BatchPerformanceChart } from '../../src/components/analytics/BatchPerformanceChart'
import { InventoryTrendChart } from '../../src/components/analytics/InventoryTrendChart'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

vi.mock('recharts', () => {
  const createMockComponent = (testId: string, tag: 'div' | 'g' | 'svg' = 'g') => {
    function MockComponent({ children }: { children?: ReactNode }) {
      if (tag === 'svg') {
        return <svg data-testid={testId}>{children}</svg>
      }

      if (tag === 'g') {
        return <g data-testid={testId}>{children}</g>
      }

      return <div data-testid={testId}>{children}</div>
    }

    MockComponent.displayName = testId
    return MockComponent
  }

  function ResponsiveContainer({
    children,
    width,
    height,
  }: {
    children?: ReactNode
    width?: string
    height?: string
  }) {
    return (
      <div data-testid="responsive-container" data-width={String(width)} data-height={String(height)}>
        {children}
      </div>
    )
  }

  return {
    Area: createMockComponent('area'),
    AreaChart: createMockComponent('area-chart', 'svg'),
    Bar: createMockComponent('bar'),
    BarChart: createMockComponent('bar-chart', 'svg'),
    CartesianGrid: createMockComponent('cartesian-grid'),
    Legend: createMockComponent('legend'),
    ResponsiveContainer,
    Tooltip: createMockComponent('tooltip'),
    XAxis: createMockComponent('x-axis'),
    YAxis: createMockComponent('y-axis'),
  }
})

const inventoryTrendData = [
  { additions: 10, date: 'Jan 01', usage: 30, waste: 2 },
  { additions: 4, date: 'Jan 08', usage: 22, waste: 1 },
]

const batchPerformanceData = [
  {
    actualOG: 1.055,
    batchId: 'batch-1',
    boilOff: 1.5,
    efficiency: 96,
    name: 'West Coast IPA',
    status: 'fermenting',
    targetOG: 1.058,
  },
  {
    actualOG: 1.049,
    batchId: 'batch-2',
    boilOff: 1.2,
    efficiency: 93,
    name: 'Pilsner',
    status: 'conditioning',
    targetOG: 1.051,
  },
]

describe('analytics chart sizing', () => {
  it('renders both analytics charts as fill-height cards with 100% chart containers', () => {
    render(
      <div className="grid lg:grid-cols-2 lg:auto-rows-fr items-stretch gap-4">
        <div className="min-w-0 h-full">
          <InventoryTrendChart data={inventoryTrendData} />
        </div>
        <div className="min-w-0 h-full">
          <BatchPerformanceChart data={batchPerformanceData} />
        </div>
      </div>
    )

    expect(screen.getByTestId('inventory-trend-card')).toHaveClass('h-full', 'min-w-0', 'flex-col')
    expect(screen.getByTestId('inventory-trend-card-content')).toHaveClass('flex-1', 'min-h-0', 'min-w-0')

    expect(screen.getByTestId('batch-performance-card')).toHaveClass('h-full', 'min-w-0', 'flex-col')
    expect(screen.getByTestId('batch-performance-card-content')).toHaveClass('flex-1', 'min-h-0', 'min-w-0')

    const containers = screen.getAllByTestId('responsive-container')
    expect(containers).toHaveLength(2)

    for (const container of containers) {
      expect(container).toHaveAttribute('data-width', '100%')
      expect(container).toHaveAttribute('data-height', '100%')
    }
  })

  it('renders a non-chart fallback during server render to avoid zero-size recharts mounts', () => {
    const inventoryMarkup = renderToStaticMarkup(<InventoryTrendChart data={inventoryTrendData} />)
    const batchMarkup = renderToStaticMarkup(<BatchPerformanceChart data={batchPerformanceData} />)

    expect(inventoryMarkup).toContain('inventory-trend-chart-fallback')
    expect(inventoryMarkup).not.toContain('responsive-container')

    expect(batchMarkup).toContain('batch-performance-chart-fallback')
    expect(batchMarkup).not.toContain('responsive-container')
  })
})