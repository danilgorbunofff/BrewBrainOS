// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockRecordInventoryChange } = vi.hoisted(() => ({
  mockRecordInventoryChange: vi.fn(),
}))

vi.mock('@/app/actions/shrinkage', () => ({
  recordInventoryChange: mockRecordInventoryChange,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { InventoryAdjustmentDialog } from '@/components/InventoryAdjustmentDialog'

const defaultProps = {
  inventoryId: 'item-001',
  inventoryName: 'Cascade Hops',
  currentStock: 100,
  unit: 'lbs',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

describe('InventoryAdjustmentDialog', () => {
  it('renders with current stock info', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    expect(screen.getByText('Adjust Inventory')).toBeInTheDocument()
    expect(screen.getByText('Cascade Hops')).toBeInTheDocument()
    expect(screen.getByText('100 lbs')).toBeInTheDocument()
  })

  it('shows change type selector with all options', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const select = screen.getByLabelText(/what caused this change/i) as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.value)

    expect(options).toEqual(['stock_adjustment', 'recipe_usage', 'received', 'waste', 'other'])
  })

  it('shows decrease change summary when stock is reduced', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '80' } })

    expect(screen.getByText(/Decrease/)).toBeInTheDocument()
    expect(screen.getByText(/20 lbs/)).toBeInTheDocument()
  })

  it('shows increase change summary when stock is added', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '120' } })

    expect(screen.getByText(/Increase/)).toBeInTheDocument()
    expect(screen.getByText(/20 lbs/)).toBeInTheDocument()
  })

  it('shows anomaly warning for large decreases (>20%)', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '70' } })

    expect(screen.getByText(/Large loss detected/)).toBeInTheDocument()
    expect(screen.getByText(/shrinkage anomaly detection/)).toBeInTheDocument()
  })

  it('calls recordInventoryChange on submit', async () => {
    mockRecordInventoryChange.mockResolvedValue({ success: true, data: {} })

    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '85' } })

    // Set a reason
    const reasonInput = screen.getByLabelText(/reason/i)
    fireEvent.change(reasonInput, { target: { value: 'Used in IPA batch' } })

    const submitBtn = screen.getByRole('button', { name: /Save Change/i })
    fireEvent.click(submitBtn)

    // Wait for async action
    await vi.waitFor(() => {
      expect(mockRecordInventoryChange).toHaveBeenCalledWith(
        'item-001',
        100,
        85,
        'stock_adjustment',
        'Used in IPA batch',
      )
    })
  })

  it('validates numeric input', async () => {
    const { toast } = await import('sonner')
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })

    const submitBtn = screen.getByRole('button', { name: /Save Change/i })
    fireEvent.click(submitBtn)

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid stock amount')
    })
  })

  it('shows previous and new stock values', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    // Current stock shown
    expect(screen.getByText('100 lbs')).toBeInTheDocument()

    // New stock input defaults to current
    const input = screen.getByLabelText(/New Stock Amount/i) as HTMLInputElement
    expect(input.value).toBe('100')
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<InventoryAdjustmentDialog {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<InventoryAdjustmentDialog {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /Close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('allows selecting different change types', () => {
    render(<InventoryAdjustmentDialog {...defaultProps} />)

    const select = screen.getByLabelText(/what caused this change/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'waste' } })

    expect(select.value).toBe('waste')
  })
})
