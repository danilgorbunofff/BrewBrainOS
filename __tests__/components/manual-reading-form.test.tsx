// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { logManualReadingMock, enqueueActionMock } = vi.hoisted(() => ({
  logManualReadingMock: vi.fn(),
  enqueueActionMock: vi.fn(),
}))

vi.mock('@/app/(app)/batches/[id]/actions', () => ({
  logManualReading: logManualReadingMock,
}))

vi.mock('@/lib/offlineQueue', () => ({
  enqueueAction: enqueueActionMock,
}))

import { ManualReadingForm } from '@/components/ManualReadingForm'

describe('ManualReadingForm', () => {
  beforeEach(() => {
    logManualReadingMock.mockReset()
    enqueueActionMock.mockReset()

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queues a manual reading immediately while offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    enqueueActionMock.mockResolvedValue({})

    render(<ManualReadingForm batchId="batch-1" />)

    fireEvent.click(screen.getByRole('button', { name: /log manual reading/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. 1.045'), { target: { value: '1.045' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log Reading' }))

    await waitFor(() => expect(enqueueActionMock).toHaveBeenCalledTimes(1))

    expect(logManualReadingMock).not.toHaveBeenCalled()
    expect(enqueueActionMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'manual-reading',
      payload: expect.objectContaining({
        batchId: 'batch-1',
        gravity: '1.045',
      }),
      externalId: expect.any(String),
    }))
    expect(screen.getByText(/queued for sync/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Reading' })).not.toBeDisabled()
  })

  it('falls back to the offline queue and clears pending state when the action throws', async () => {
    logManualReadingMock.mockRejectedValue(new Error('network dropped'))
    enqueueActionMock.mockResolvedValue({})

    render(<ManualReadingForm batchId="batch-1" />)

    fireEvent.click(screen.getByRole('button', { name: /log manual reading/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. 18.5'), { target: { value: '18.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log Reading' }))

    await waitFor(() => expect(enqueueActionMock).toHaveBeenCalledTimes(1))

    expect(logManualReadingMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/connection dropped\. reading queued for sync/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Reading' })).not.toBeDisabled()
  })

  it('shows an inline error when the server action returns an unsuccessful result', async () => {
    logManualReadingMock.mockResolvedValue({ success: false, error: 'Gravity value is invalid' })

    render(<ManualReadingForm batchId="batch-1" />)

    fireEvent.click(screen.getByRole('button', { name: /log manual reading/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. 1.045'), { target: { value: '1.100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log Reading' }))

    await waitFor(() => expect(logManualReadingMock).toHaveBeenCalledTimes(1))

    expect(enqueueActionMock).not.toHaveBeenCalled()
    expect(screen.getByText('Gravity value is invalid')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Reading' })).not.toBeDisabled()
  })

  it('shows a hard failure when both the action and offline queue fallback fail', async () => {
    logManualReadingMock.mockRejectedValue(new Error('network dropped'))
    enqueueActionMock.mockRejectedValue(new Error('queue write failed'))

    render(<ManualReadingForm batchId="batch-1" />)

    fireEvent.click(screen.getByRole('button', { name: /log manual reading/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. 18.5'), { target: { value: '18.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log Reading' }))

    await waitFor(() => expect(enqueueActionMock).toHaveBeenCalledTimes(1))

    expect(screen.getByText('Failed to log reading')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Reading' })).not.toBeDisabled()
  })

  it('shows success for an online submission and clears the status after the timeout', async () => {
    vi.useFakeTimers()
    logManualReadingMock.mockResolvedValue({ success: true, data: null })

    render(<ManualReadingForm batchId="batch-1" />)

    fireEvent.click(screen.getByRole('button', { name: /log manual reading/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. 1.045'), { target: { value: '1.045' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log Reading' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(logManualReadingMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/reading logged/i)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText(/reading logged/i)).not.toBeInTheDocument()
  })
})