import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cookieDeleteMock, cookieGetAllMock, cookiesMock, signOutMock, createClientMock } = vi.hoisted(() => ({
  cookieDeleteMock: vi.fn(),
  cookieGetAllMock: vi.fn(),
  cookiesMock: vi.fn(),
  signOutMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: createClientMock,
}))

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    cookieGetAllMock.mockReturnValue([
      { name: 'brewbrain_active_brewery', value: 'brewery-1' },
      { name: 'sb-test-auth-token', value: 'token' },
      { name: 'sb-test-auth-token.0', value: 'chunk' },
      { name: 'theme', value: 'light' },
    ])
    cookiesMock.mockResolvedValue({
      getAll: cookieGetAllMock,
      delete: cookieDeleteMock,
    })
    signOutMock.mockResolvedValue({ error: null })
    createClientMock.mockResolvedValue({
      auth: {
        signOut: signOutMock,
      },
    })
  })

  it('returns json for fetch callers and deletes auth-related cookies', async () => {
    const { POST } = await import('@/app/api/auth/signout/route')

    const response = await POST(new Request('http://localhost/api/auth/signout', {
      method: 'POST',
      headers: {
        accept: 'application/json',
      },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, redirectTo: '/login' })
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(cookieDeleteMock).toHaveBeenCalledTimes(3)
    expect(cookieDeleteMock).toHaveBeenCalledWith('brewbrain_active_brewery')
    expect(cookieDeleteMock).toHaveBeenCalledWith('sb-test-auth-token')
    expect(cookieDeleteMock).toHaveBeenCalledWith('sb-test-auth-token.0')
    expect(cookieDeleteMock).not.toHaveBeenCalledWith('theme')
  })

  it('redirects form posts back to the login page', async () => {
    const { POST } = await import('@/app/api/auth/signout/route')

    const response = await POST(new Request('http://localhost/api/auth/signout', {
      method: 'POST',
    }))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/login')
  })
})