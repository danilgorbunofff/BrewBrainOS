// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { updateShrinkageTTBRemarksMock } = vi.hoisted(() => ({
  updateShrinkageTTBRemarksMock: vi.fn(),
}))

vi.mock('@/app/(app)/compliance/actions', () => ({
  updateShrinkageTTBRemarks: updateShrinkageTTBRemarksMock,
}))

vi.mock('lucide-react', () => ({
  LucideCheck: () => <span data-testid="check-icon" />,
  LucideMessageSquarePlus: () => <span data-testid="message-icon" />,
  LucideLoader2: () => <span data-testid="loader-icon" />,
}))

import { TTBRemarksForm } from '@/components/TTBRemarksForm'

// ─── Tests ──────────────────────────────────────────────────────────
describe('TTBRemarksForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateShrinkageTTBRemarksMock.mockResolvedValue({ success: true, data: { id: 'alert-001' } })
  })

  it('renders "Add TTB Remarks" button initially', () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    expect(screen.getByText('Add TTB Remarks')).toBeInTheDocument()
  })

  it('shows inline editor when button is clicked', () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    fireEvent.click(screen.getByText('Add TTB Remarks'))

    expect(screen.getByPlaceholderText(/Reason for loss/i)).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save Report')).toBeInTheDocument()
  })

  it('hides editor when Cancel is clicked', () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    fireEvent.click(screen.getByText('Add TTB Remarks'))
    expect(screen.getByText('Cancel')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))

    // Should go back to the initial button
    expect(screen.getByText('Add TTB Remarks')).toBeInTheDocument()
  })

  it('calls updateShrinkageTTBRemarks on submit', async () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    fireEvent.click(screen.getByText('Add TTB Remarks'))

    const textarea = screen.getByPlaceholderText(/Reason for loss/i)
    fireEvent.change(textarea, { target: { value: 'Forklift incident in walk-in' } })

    const submitBtn = screen.getByText('Save Report')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(updateShrinkageTTBRemarksMock).toHaveBeenCalledWith(
        'alert-001',
        'Forklift incident in walk-in',
        true
      )
    })
  })

  it('shows success state after submission', async () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    fireEvent.click(screen.getByText('Add TTB Remarks'))

    const textarea = screen.getByPlaceholderText(/Reason for loss/i)
    fireEvent.change(textarea, { target: { value: 'Test remark' } })

    fireEvent.click(screen.getByText('Save Report'))

    await waitFor(() => {
      expect(screen.getByText('REMARK ADDED')).toBeInTheDocument()
    })
  })

  it('does not submit with empty remarks', () => {
    render(<TTBRemarksForm alertId="alert-001" />)

    fireEvent.click(screen.getByText('Add TTB Remarks'))

    // The save button should be present but submitting without text should not call the action
    const submitBtn = screen.getByText('Save Report')
    fireEvent.click(submitBtn)

    expect(updateShrinkageTTBRemarksMock).not.toHaveBeenCalled()
  })
})
