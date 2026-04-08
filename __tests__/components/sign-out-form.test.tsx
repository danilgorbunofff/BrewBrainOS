// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { refreshMock, replaceMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  replaceMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
    replace: replaceMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

import { SignOutForm } from '@/components/SignOutForm'

describe('SignOutForm', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    replaceMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('calls the server signout route and redirects on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirectTo: '/login' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    render(<SignOutForm />)

    fireEvent.click(screen.getByRole('button', { name: /log out session/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/signout', expect.objectContaining({
      method: 'POST',
      cache: 'no-store',
    })))

    expect(toastSuccessMock).toHaveBeenCalledWith('Signed out successfully.')
    expect(replaceMock).toHaveBeenCalledWith('/login')
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces route errors and keeps the user on the current page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Sign out failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    render(<SignOutForm />)

    fireEvent.click(screen.getByRole('button', { name: /log out session/i }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Sign out failed'))

    expect(replaceMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /log out session/i })).toBeEnabled()
  })
})