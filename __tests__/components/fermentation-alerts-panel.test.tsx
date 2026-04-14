// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { acknowledgeAlertMock, refreshMock, toastErrorMock } = vi.hoisted(() => ({
  acknowledgeAlertMock: vi.fn(),
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/app/(app)/batches/[id]/actions', () => ({
  acknowledgeAlert: acknowledgeAlertMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { FermentationAlertsPanel } from '@/components/FermentationAlertsPanel'
import type { FermentationAlert } from '@/types/database'

const makeAlert = (overrides: Partial<FermentationAlert> = {}): FermentationAlert => ({
  id: 'alert-1',
  batch_id: 'batch-1',
  brewery_id: 'brewery-1',
  alert_type: 'temperature_deviation',
  severity: 'warning',
  status: 'active',
  message: 'Temperature is too high.',
  actual_value: 82,
  threshold_value: 75,
  created_at: '2026-04-14T00:00:00Z',
  ...overrides,
})

describe('FermentationAlertsPanel', () => {
  beforeEach(() => {
    acknowledgeAlertMock.mockReset()
    refreshMock.mockReset()
    toastErrorMock.mockReset()
  })

  describe('collapsed state', () => {
    it('starts collapsed with a Nominal badge when there are no alerts', () => {
      render(<FermentationAlertsPanel alerts={[]} batchId="batch-1" />)

      expect(screen.getByRole('button', { name: /fermentation alerts/i })).toBeInTheDocument()
      expect(screen.getByText(/nominal/i)).toBeInTheDocument()
      expect(screen.queryByText('All parameters nominal')).not.toBeInTheDocument()
    })

    it('sets aria-expanded="false" when collapsed', () => {
      render(<FermentationAlertsPanel alerts={[]} batchId="batch-1" />)

      const toggleBtn = screen.getByRole('button', { name: /fermentation alerts/i })
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('expanded state with active alerts', () => {
    it('starts expanded and shows the alert body when active alerts exist', () => {
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      expect(screen.getByText('Temperature is too high.')).toBeInTheDocument()
    })

    it('shows the active count badge in the header', () => {
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      expect(screen.getByText('1 Active')).toBeInTheDocument()
    })

    it('shows the correct count when multiple active alerts exist', () => {
      render(
        <FermentationAlertsPanel
          alerts={[makeAlert(), makeAlert({ id: 'alert-2', message: 'pH is dropping.' })]}
          batchId="batch-1"
        />
      )

      expect(screen.getByText('2 Active')).toBeInTheDocument()
    })

    it('sets aria-expanded="true" when expanded', () => {
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      const toggleBtn = screen.getByRole('button', { name: /fermentation alerts/i })
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('toggle interaction', () => {
    it('collapses content when the header button is clicked while expanded', () => {
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      expect(screen.getByText('Temperature is too high.')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /fermentation alerts/i }))

      expect(screen.queryByText('Temperature is too high.')).not.toBeInTheDocument()
    })

    it('expands to show the empty state when the header is clicked while collapsed', () => {
      render(<FermentationAlertsPanel alerts={[]} batchId="batch-1" />)

      expect(screen.queryByText('All parameters nominal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /fermentation alerts/i }))

      expect(screen.getByText('All parameters nominal')).toBeInTheDocument()
      expect(screen.getByText('No active fermentation alerts detected.')).toBeInTheDocument()
    })

    it('keeps the active count badge visible while collapsed', () => {
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      fireEvent.click(screen.getByRole('button', { name: /fermentation alerts/i }))

      expect(screen.getByText('1 Active')).toBeInTheDocument()
      expect(screen.queryByText('Temperature is too high.')).not.toBeInTheDocument()
    })
  })

  describe('acknowledge flow', () => {
    it('calls acknowledgeAlert with correct FormData and refreshes on success', async () => {
      acknowledgeAlertMock.mockResolvedValue({ success: true })
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }))

      await waitFor(() => expect(acknowledgeAlertMock).toHaveBeenCalledOnce())
      await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
    })

    it('shows a toast error when acknowledgement fails', async () => {
      acknowledgeAlertMock.mockResolvedValue({ success: false, error: 'Server error' })
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }))

      await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Server error'))
      expect(refreshMock).not.toHaveBeenCalled()
    })

    it('does not call acknowledgeAlert a second time on rapid repeated clicks', async () => {
      let resolveAck!: (v: { success: boolean }) => void
      acknowledgeAlertMock.mockReturnValue(new Promise((resolve) => { resolveAck = resolve }))
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      const btn = screen.getByRole('button', { name: /acknowledge/i })
      fireEvent.click(btn)
      fireEvent.click(btn)
      fireEvent.click(btn)

      resolveAck({ success: true })

      await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce())
      expect(acknowledgeAlertMock).toHaveBeenCalledOnce()
    })

    it('disables the acknowledge button while the action is in flight', async () => {
      let resolveAck!: (v: { success: boolean }) => void
      acknowledgeAlertMock.mockReturnValue(new Promise((resolve) => { resolveAck = resolve }))
      render(<FermentationAlertsPanel alerts={[makeAlert()]} batchId="batch-1" />)

      const btn = screen.getByRole('button', { name: /acknowledge/i })
      fireEvent.click(btn)

      await waitFor(() => expect(btn).toBeDisabled())

      resolveAck({ success: true })
      await waitFor(() => expect(btn).not.toBeDisabled())
    })
  })
})
