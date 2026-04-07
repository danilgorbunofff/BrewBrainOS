// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})