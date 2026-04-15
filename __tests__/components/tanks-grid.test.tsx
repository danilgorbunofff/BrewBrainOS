// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { deleteTankMock } = vi.hoisted(() => ({
  deleteTankMock: vi.fn(),
}))

vi.mock('@/app/(app)/tanks/actions', () => ({
  deleteTank: deleteTankMock,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; prefetch?: boolean }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/components/DeleteConfirmButton', () => ({
  DeleteConfirmButton: ({ itemName }: { itemName: string }) => (
    <button aria-label={`Delete ${itemName}`}>Delete</button>
  ),
}))

vi.mock('@/components/AddTankForm', () => ({
  AddTankForm: ({ onOptimisticAdd }: { onOptimisticAdd?: (id: string, name: string, capacity?: number) => void }) => (
    <div data-testid="add-tank-form">
      <button onClick={() => onOptimisticAdd?.('test-id', 'New Tank', 10)}>Add</button>
    </div>
  ),
}))

import { TanksGrid } from '@/components/TanksGrid'

// ─── Helpers ────────────────────────────────────────────────────────
function makeTank(overrides: Partial<{
  id: string; name: string; status: string | null; capacity: number | null;
  brewery_id: string; current_batch_id: string | null;
}> = {}) {
  return {
    id: 'id' in overrides ? overrides.id! : 'tank-001',
    name: 'name' in overrides ? overrides.name! : 'FV-1',
    status: 'status' in overrides ? overrides.status : 'ready',
    capacity: 'capacity' in overrides ? overrides.capacity! : 10,
    brewery_id: 'brewery_id' in overrides ? overrides.brewery_id! : 'brewery-001',
    current_batch_id: 'current_batch_id' in overrides ? overrides.current_batch_id! : null,
  }
}

describe('TanksGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tank cards for each tank in props', () => {
    const tanks = [
      makeTank({ id: 't-1', name: 'FV-1' }),
      makeTank({ id: 't-2', name: 'FV-2' }),
      makeTank({ id: 't-3', name: 'BT-1' }),
    ]

    render(<TanksGrid tanks={tanks} />)

    expect(screen.getByText('FV-1')).toBeInTheDocument()
    expect(screen.getByText('FV-2')).toBeInTheDocument()
    expect(screen.getByText('BT-1')).toBeInTheDocument()
  })

  it('shows empty state when tanks array is empty', () => {
    render(<TanksGrid tanks={[]} />)

    expect(screen.getByText('No Vessels Initialized')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first vessel/i })).toBeInTheDocument()
  })

  it('renders correct grid layout container', () => {
    const tanks = [makeTank()]
    const { container } = render(<TanksGrid tanks={tanks} />)

    const gridDiv = container.querySelector('.grid')
    expect(gridDiv).toBeInTheDocument()
    expect(gridDiv?.className).toContain('grid-cols-1')
    expect(gridDiv?.className).toContain('md:grid-cols-2')
    expect(gridDiv?.className).toContain('lg:grid-cols-4')
  })

  it('tank card links to /tank/{id}', () => {
    const tanks = [makeTank({ id: 'tank-abc-123' })]
    render(<TanksGrid tanks={tanks} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/tank/tank-abc-123')
  })

  it('renders delete button for each tank', () => {
    const tanks = [
      makeTank({ id: 't-1', name: 'FV-1' }),
      makeTank({ id: 't-2', name: 'FV-2' }),
    ]

    render(<TanksGrid tanks={tanks} />)

    expect(screen.getByLabelText('Delete FV-1')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete FV-2')).toBeInTheDocument()
  })

  it('shows "Ready" label for ready tanks', () => {
    render(<TanksGrid tanks={[makeTank({ status: 'ready' })]} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows "Active Cycle" label for fermenting tanks with a batch', () => {
    render(
      <TanksGrid
        tanks={[makeTank({ status: 'fermenting', current_batch_id: 'batch-001' })]}
      />
    )
    expect(screen.getByText('Active Cycle')).toBeInTheDocument()
  })

  it('shows "No Batch Assigned" for fermenting tanks without a batch', () => {
    render(
      <TanksGrid
        tanks={[makeTank({ status: 'fermenting', current_batch_id: null })]}
      />
    )
    expect(screen.getByText('No Batch Assigned')).toBeInTheDocument()
  })

  it('displays BBL capacity', () => {
    const { container } = render(<TanksGrid tanks={[makeTank({ capacity: 15 })]} />)
    const bblSpan = container.querySelector('.font-mono.font-black')
    expect(bblSpan?.textContent).toContain('15')
    expect(bblSpan?.textContent).toContain('BBL')
  })

  it('displays ?? for missing capacity', () => {
    const { container } = render(<TanksGrid tanks={[makeTank({ capacity: null })]} />)
    const bblSpan = container.querySelector('.font-mono.font-black')
    expect(bblSpan?.textContent).toContain('??')
    expect(bblSpan?.textContent).toContain('BBL')
  })

  it('renders AddTankForm', () => {
    render(<TanksGrid tanks={[]} />)
    expect(screen.getByTestId('add-tank-form')).toBeInTheDocument()
  })
})
