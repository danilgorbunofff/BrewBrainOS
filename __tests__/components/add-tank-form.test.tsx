// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { addTankMock } = vi.hoisted(() => ({
  addTankMock: vi.fn(),
}))

vi.mock('@/app/(app)/tanks/actions', () => ({
  addTank: addTankMock,
}))

vi.mock('@/components/FormWithToast', () => ({
  FormWithToast: ({
    children,
    action,
  }: {
    children: React.ReactNode
    action: (fd: FormData) => Promise<unknown>
    successMessage?: string
    resetOnSuccess?: boolean
  }) => (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await action(fd)
      }}
    >
      {children}
    </form>
  ),
}))

vi.mock('@/components/SubmitButton', () => ({
  SubmitButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    pendingText?: string
    size?: string
  }) => (
    <button type="submit" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('lucide-react', () => ({
  LucidePlus: () => <span data-testid="plus-icon" />,
}))

import { AddTankForm } from '@/components/AddTankForm'

describe('AddTankForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addTankMock.mockResolvedValue({ success: true, data: null })
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      ...globalThis.crypto,
      randomUUID: () => '00000000-0000-0000-0000-000000000001',
    })
  })

  it('renders name and capacity inputs', () => {
    render(<AddTankForm />)

    expect(screen.getByPlaceholderText('Tank ID')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('BBL')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<AddTankForm />)
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument()
  })

  it('name input is required', () => {
    render(<AddTankForm />)
    const nameInput = screen.getByPlaceholderText('Tank ID')
    expect(nameInput).toHaveAttribute('required')
  })

  it('capacity input is type number', () => {
    render(<AddTankForm />)
    const capacityInput = screen.getByPlaceholderText('BBL')
    expect(capacityInput).toHaveAttribute('type', 'number')
  })

  it('calls onOptimisticAdd with generated UUID on submit', async () => {
    const onOptimisticAdd = vi.fn()
    render(<AddTankForm onOptimisticAdd={onOptimisticAdd} />)

    fireEvent.change(screen.getByPlaceholderText('Tank ID'), {
      target: { value: 'FV-1' },
    })
    fireEvent.change(screen.getByPlaceholderText('BBL'), {
      target: { value: '10' },
    })
    fireEvent.submit(screen.getByRole('button', { name: '' }).closest('form')!)

    // onOptimisticAdd receives the generated UUID, name, and capacity
    expect(onOptimisticAdd).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'FV-1',
      10,
    )
  })

  it('calls addTank server action with form data including id', async () => {
    render(<AddTankForm />)

    fireEvent.change(screen.getByPlaceholderText('Tank ID'), {
      target: { value: 'BT-1' },
    })
    fireEvent.submit(screen.getByRole('button', { name: '' }).closest('form')!)

    expect(addTankMock).toHaveBeenCalledTimes(1)
    const formData: FormData = addTankMock.mock.calls[0][0]
    expect(formData.get('id')).toBe('00000000-0000-0000-0000-000000000001')
    expect(formData.get('name')).toBe('BT-1')
  })

  it('works without onOptimisticAdd callback', async () => {
    render(<AddTankForm />)

    fireEvent.change(screen.getByPlaceholderText('Tank ID'), {
      target: { value: 'FV-2' },
    })
    fireEvent.submit(screen.getByRole('button', { name: '' }).closest('form')!)

    expect(addTankMock).toHaveBeenCalledTimes(1)
  })
})
