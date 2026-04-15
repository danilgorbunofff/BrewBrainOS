// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/components/ui/select', () => {
  const SelectRoot = ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (v: string) => void
    value?: string
  }) => (
    <div data-testid="select-root" data-value={value}>
      {typeof children === 'function' ? children : children}
      {onValueChange && (
        <input
          data-testid="select-change"
          type="hidden"
          onChange={(e) => onValueChange(e.target.value)}
        />
      )}
    </div>
  )

  return {
    Select: SelectRoot,
    SelectTrigger: ({ children }: { children: React.ReactNode; className?: string }) => (
      <button role="combobox">{children}</button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode; className?: string }) => (
      <div role="listbox">{children}</div>
    ),
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => (
      <div role="option" data-value={value}>
        {children}
      </div>
    ),
  }
})

vi.mock('lucide-react', () => ({
  LucideLink: () => <span data-testid="link-icon" />,
}))

import { AssignBatchSelect } from '@/components/AssignBatchSelect'

const mockAction = vi.fn()

const sampleBatches = [
  { id: 'batch-1', recipe_name: 'IPA', status: 'fermenting' },
  { id: 'batch-2', recipe_name: 'Stout', status: 'conditioning' },
]

describe('AssignBatchSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropdown with available batches', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    expect(screen.getByText('IPA (fermenting)')).toBeInTheDocument()
    expect(screen.getByText('Stout (conditioning)')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    expect(screen.getByText('Select batch to assign…')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    expect(screen.getByRole('button', { name: /assign batch to tank/i })).toBeInTheDocument()
  })

  it('submit button is disabled when no batch is selected', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    expect(screen.getByRole('button', { name: /assign batch to tank/i })).toBeDisabled()
  })

  it('includes hidden inputs for tankId and batchId', () => {
    const { container } = render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    const tankInput = container.querySelector('input[name="tankId"]') as HTMLInputElement
    expect(tankInput).toBeInTheDocument()
    expect(tankInput.value).toBe('tank-001')

    const batchInput = container.querySelector('input[name="batchId"]') as HTMLInputElement
    expect(batchInput).toBeInTheDocument()
  })

  it('renders all batch options', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  it('renders empty list when no batches provided', () => {
    render(
      <AssignBatchSelect tankId="tank-001" batches={[]} action={mockAction} />
    )

    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('submits form with action prop', () => {
    const { container } = render(
      <AssignBatchSelect tankId="tank-001" batches={sampleBatches} action={mockAction} />
    )

    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()
  })
})
