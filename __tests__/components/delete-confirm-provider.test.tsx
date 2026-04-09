// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteConfirmProvider } from '@/components/DeleteConfirmProvider'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function makeRedirectError() {
  const err = new Error('NEXT_REDIRECT')
  Object.assign(err, { digest: 'NEXT_REDIRECT;replace;/batches;307;' })
  return err
}

describe('DeleteConfirmProvider', () => {
  it('closes the dialog after a successful delete', async () => {
    const deleteAction = vi.fn(async () => ({ success: true }))

    render(
      <DeleteConfirmProvider>
        <DeleteConfirmDialog
          action={deleteAction}
          hiddenInputs={{ batchId: 'abc-123' }}
          itemName="Test Batch"
        />
      </DeleteConfirmProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Test Batch' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Purge' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes the dialog when the delete action throws a NEXT_REDIRECT error', async () => {
    const deleteAction = vi.fn(async () => {
      throw makeRedirectError()
    })

    render(
      <DeleteConfirmProvider>
        <DeleteConfirmDialog
          action={deleteAction}
          hiddenInputs={{ batchId: 'abc-123' }}
          itemName="Test Batch"
        />
      </DeleteConfirmProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Test Batch' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Purge' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('keeps the dialog open when the delete action returns a failure result', async () => {
    const deleteAction = vi.fn(async () => ({ success: false, error: 'Not found' }))

    render(
      <DeleteConfirmProvider>
        <DeleteConfirmDialog
          action={deleteAction}
          hiddenInputs={{ batchId: 'abc-123' }}
          itemName="Test Batch"
        />
      </DeleteConfirmProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Test Batch' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Purge' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
