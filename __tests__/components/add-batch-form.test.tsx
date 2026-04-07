// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addBatchMock, refreshMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  addBatchMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/app/(app)/batches/actions', () => ({
  addBatch: addBatchMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

import { AddBatchForm } from '@/components/AddBatchForm'

describe('AddBatchForm', () => {
  beforeEach(() => {
    addBatchMock.mockReset()
    refreshMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('adds an optimistic row and refreshes on success', async () => {
    const onOptimisticAdd = vi.fn()
    addBatchMock.mockResolvedValue({
      success: true,
      data: {
        id: 'batch-1',
        recipe_name: 'West Coast IPA',
        status: 'fermenting',
        og: 1.055,
        fg: null,
        created_at: new Date().toISOString(),
      },
    })

    render(<AddBatchForm onOptimisticAdd={onOptimisticAdd} />)

    fireEvent.change(screen.getByPlaceholderText('Recipe Name'), { target: { value: 'West Coast IPA' } })
    fireEvent.change(screen.getByPlaceholderText('OG'), { target: { value: '1.055' } })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(addBatchMock).toHaveBeenCalledTimes(1))

    expect(onOptimisticAdd).toHaveBeenCalledWith(expect.any(String), 'West Coast IPA', 1.055)
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledWith('Batch created successfully')
  })

  it('rolls back the optimistic row when the server action fails', async () => {
    const onOptimisticRollback = vi.fn()
    addBatchMock.mockResolvedValue({ success: false, error: 'Recipe name is required' })

    render(
      <AddBatchForm
        onOptimisticAdd={vi.fn()}
        onOptimisticRollback={onOptimisticRollback}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Recipe Name'), { target: { value: 'Amber Ale' } })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(addBatchMock).toHaveBeenCalledTimes(1))

    expect(onOptimisticRollback).toHaveBeenCalledWith(expect.any(String))
    expect(refreshMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('Recipe name is required')
  })

  it('does not add an optimistic row when the recipe name is blank and normalizes invalid OG to null', async () => {
    const onOptimisticAdd = vi.fn()
    addBatchMock.mockResolvedValue({ success: true, data: null })

    render(<AddBatchForm onOptimisticAdd={onOptimisticAdd} />)

    fireEvent.change(screen.getByPlaceholderText('OG'), { target: { value: 'not-a-number' } })
    fireEvent.submit(screen.getByPlaceholderText('Recipe Name').closest('form') as HTMLFormElement)

    await waitFor(() => expect(addBatchMock).toHaveBeenCalledTimes(1))

    expect(onOptimisticAdd).not.toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith('Batch created successfully')
  })

  it('surfaces thrown string errors and rolls back optimistic state', async () => {
    const onOptimisticRollback = vi.fn()
    addBatchMock.mockRejectedValue('Batch service unavailable')

    render(
      <AddBatchForm
        onOptimisticAdd={vi.fn()}
        onOptimisticRollback={onOptimisticRollback}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Recipe Name'), { target: { value: 'Dry Stout' } })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(addBatchMock).toHaveBeenCalledTimes(1))

    expect(onOptimisticRollback).toHaveBeenCalledWith(expect.any(String))
    expect(refreshMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('Batch service unavailable')
  })

  it('surfaces thrown Error instances and falls back for unknown thrown values', async () => {
    const onOptimisticRollback = vi.fn()

    addBatchMock.mockRejectedValueOnce(new Error('Timed out creating batch'))
    addBatchMock.mockRejectedValueOnce({})

    const { rerender } = render(
      <AddBatchForm
        onOptimisticAdd={vi.fn()}
        onOptimisticRollback={onOptimisticRollback}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Recipe Name'), { target: { value: 'Pale Ale' } })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Timed out creating batch'))

    rerender(
      <AddBatchForm
        onOptimisticAdd={vi.fn()}
        onOptimisticRollback={onOptimisticRollback}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Recipe Name'), { target: { value: 'Porter' } })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Failed to create batch'))
    expect(onOptimisticRollback).toHaveBeenCalledTimes(2)
  })
})