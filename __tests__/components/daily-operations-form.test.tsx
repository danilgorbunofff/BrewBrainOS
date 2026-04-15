// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { logDailyOperationMock } = vi.hoisted(() => ({
  logDailyOperationMock: vi.fn(),
}))

vi.mock('@/app/(app)/compliance/actions', () => ({
  logDailyOperation: logDailyOperationMock,
}))

vi.mock('lucide-react', () => ({
  LucideCheck: () => <span data-testid="check-icon" />,
  LucideLoader2: () => <span data-testid="loader-icon" />,
}))

vi.mock('@/types/database', async (importOriginal) => {
  const actual = await importOriginal()
  return actual as Record<string, unknown>
})

import { DailyOperationsForm } from '@/components/DailyOperationsForm'

// ─── Tests ──────────────────────────────────────────────────────────
describe('DailyOperationsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logDailyOperationMock.mockResolvedValue({ success: true, data: { id: 'log-001' } })
  })

  it('renders all form fields', () => {
    render(<DailyOperationsForm />)

    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
    expect(screen.getByText(/TTB Remarks/i)).toBeInTheDocument()
  })

  it('operation type dropdown has 5 options', () => {
    render(<DailyOperationsForm />)

    const typeSelect = screen.getByDisplayValue('Removal (Taxpaid)')
    expect(typeSelect).toBeInTheDocument()

    const options = typeSelect.querySelectorAll('option')
    expect(options).toHaveLength(5)
  })

  it('unit dropdown has 3 options (BBL, Gallons, Liters)', () => {
    render(<DailyOperationsForm />)

    const unitSelect = screen.getByDisplayValue('BBL (Barrels)')
    expect(unitSelect).toBeInTheDocument()

    const options = unitSelect.querySelectorAll('option')
    expect(options).toHaveLength(3)
  })

  it('submits form data correctly', async () => {
    render(<DailyOperationsForm />)

    const quantityInput = screen.getByDisplayValue('1.0')
    fireEvent.change(quantityInput, { target: { value: '5.5' } })

    const submitBtn = screen.getByRole('button', { name: /Log Operation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(logDailyOperationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 5.5,
          unit: 'bbl',
          operationType: 'removal_taxpaid',
          ttbReportable: true,
        })
      )
    })
  })

  it('shows success state after submission', async () => {
    render(<DailyOperationsForm />)

    const submitBtn = screen.getByRole('button', { name: /Log Operation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Operation Logged')).toBeInTheDocument()
    })
  })

  it('resets quantity and remarks on success', async () => {
    render(<DailyOperationsForm />)

    const quantityInput = screen.getByDisplayValue('1.0') as HTMLInputElement
    fireEvent.change(quantityInput, { target: { value: '5' } })

    const submitBtn = screen.getByRole('button', { name: /Log Operation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(quantityInput.value).toBe('')
    })
  })

  it('defaults date to today', () => {
    render(<DailyOperationsForm />)

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByDisplayValue(today)
    expect(dateInput).toBeInTheDocument()
  })
})
