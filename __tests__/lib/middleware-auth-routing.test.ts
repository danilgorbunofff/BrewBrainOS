import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const getUserMock = vi.hoisted(() => vi.fn())

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
  }),
}))

vi.mock('@/lib/env', () => ({
  getRequiredEnv: (key: string) => {
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') return 'https://test.supabase.co'
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return 'test-anon-key'
    return ''
  },
}))

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'))
}

describe('updateSession middleware auth routing', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('redirects authenticated user from /login to /dashboard', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/login'))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/dashboard')
  })

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/dashboard'))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login')
  })

  it('redirects unauthenticated user from /batches to /login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/batches'))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login')
  })

  it('allows unauthenticated user to access / (landing page)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/'))

    // Should pass through, not redirect
    expect(response.status).toBe(200)
  })

  it('allows unauthenticated user to access /login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/login'))

    expect(response.status).toBe(200)
  })

  it('allows unauthenticated user to access /api/* routes', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/api/iot/log'))

    expect(response.status).toBe(200)
  })

  it('allows authenticated user to access /dashboard', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })
    const { updateSession } = await import('@/utils/supabase/middleware')

    const response = await updateSession(makeRequest('/dashboard'))

    expect(response.status).toBe(200)
  })
})
