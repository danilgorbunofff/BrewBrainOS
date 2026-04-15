// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockCreateClient, mockCookies } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCookies: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/headers', () => ({ cookies: mockCookies }))

// ─── Helpers ────────────────────────────────────────────────────────
function makeSupa(overrides?: {
  user?: { id: string } | null
  cookieBrewery?: { id: string; name: string; license_number: string | null } | null
  cookieBreweryError?: unknown
  fallbackBrewery?: { id: string; name: string; license_number: string | null } | null
  fallbackBreweryError?: unknown
  breweries?: { id: string; name: string; license_number: string | null }[]
  breweriesError?: unknown
}) {
  const opts = overrides || {}
  const user = opts.user === undefined ? { id: 'u-1' } : opts.user

  return {
    auth: { getUser: () => Promise.resolve({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          if (col === 'id') {
            // This is the cookie-based lookup: .eq('id', storedId).eq('owner_id', userId)
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: opts.cookieBrewery ?? null,
                  error: opts.cookieBreweryError ?? null,
                }),
              }),
            }
          }
          if (col === 'owner_id') {
            // getUserBreweries or fallback
            if (opts.breweries !== undefined) {
              return {
                order: () => Promise.resolve({
                  data: opts.breweries,
                  error: opts.breweriesError ?? null,
                }),
                limit: () => ({
                  maybeSingle: () => Promise.resolve({
                    data: opts.breweries?.[0] ?? null,
                    error: opts.breweriesError ?? null,
                  }),
                }),
              }
            }
            return {
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({
                    data: opts.fallbackBrewery ?? null,
                    error: opts.fallbackBreweryError ?? null,
                  }),
                }),
              }),
            }
          }
          return {
            order: () => Promise.resolve({ data: [], error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }
        },
      }),
    }),
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('active-brewery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getUserBreweries', () => {
    it('returns breweries for authenticated user', async () => {
      const breweries = [
        { id: 'b-1', name: 'Alpha Brewing', license_number: 'L-001' },
        { id: 'b-2', name: 'Beta Brewing', license_number: null },
      ]
      mockCreateClient.mockResolvedValue(makeSupa({ breweries }))
      const { getUserBreweries } = await import('@/lib/active-brewery')
      const result = await getUserBreweries()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Alpha Brewing')
    })

    it('returns empty array when not authenticated', async () => {
      mockCreateClient.mockResolvedValue(makeSupa({ user: null }))
      const { getUserBreweries } = await import('@/lib/active-brewery')
      const result = await getUserBreweries()
      expect(result).toEqual([])
    })

    it('returns empty array on database error', async () => {
      mockCreateClient.mockResolvedValue(makeSupa({
        breweries: [],
        breweriesError: { message: 'DB error' },
      }))
      const { getUserBreweries } = await import('@/lib/active-brewery')
      const result = await getUserBreweries()
      expect(result).toEqual([])
    })
  })

  describe('getActiveBrewery', () => {
    it('returns brewery from cookie when valid', async () => {
      const brewery = { id: 'b-1', name: 'My Brewery', license_number: 'L-1' }
      mockCookies.mockResolvedValue({
        get: (name: string) => name === 'brewbrain_active_brewery' ? { value: 'b-1' } : undefined,
      })
      mockCreateClient.mockResolvedValue(makeSupa({ cookieBrewery: brewery }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toEqual(brewery)
    })

    it('falls back to first brewery when cookie is invalid', async () => {
      const fallback = { id: 'b-2', name: 'Fallback Brewery', license_number: null }
      mockCookies.mockResolvedValue({
        get: (name: string) => name === 'brewbrain_active_brewery' ? { value: 'invalid-id' } : undefined,
      })
      mockCreateClient.mockResolvedValue(makeSupa({
        cookieBrewery: null,
        fallbackBrewery: fallback,
      }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toEqual(fallback)
    })

    it('falls back to first brewery when no cookie exists', async () => {
      const fallback = { id: 'b-1', name: 'Only Brewery', license_number: 'L-1' }
      mockCookies.mockResolvedValue({
        get: () => undefined,
      })
      mockCreateClient.mockResolvedValue(makeSupa({ fallbackBrewery: fallback }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toEqual(fallback)
    })

    it('returns null when not authenticated', async () => {
      mockCookies.mockResolvedValue({ get: () => undefined })
      mockCreateClient.mockResolvedValue(makeSupa({ user: null }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toBeNull()
    })

    it('returns null when user has no breweries', async () => {
      mockCookies.mockResolvedValue({ get: () => undefined })
      mockCreateClient.mockResolvedValue(makeSupa({
        cookieBrewery: null,
        fallbackBrewery: null,
      }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toBeNull()
    })

    it('handles cookie lookup error gracefully', async () => {
      const fallback = { id: 'b-1', name: 'Fallback', license_number: null }
      mockCookies.mockResolvedValue({
        get: (name: string) => name === 'brewbrain_active_brewery' ? { value: 'b-err' } : undefined,
      })
      mockCreateClient.mockResolvedValue(makeSupa({
        cookieBrewery: null,
        cookieBreweryError: { message: 'RLS error' },
        fallbackBrewery: fallback,
      }))
      const { getActiveBrewery } = await import('@/lib/active-brewery')
      const result = await getActiveBrewery()
      expect(result).toEqual(fallback)
    })
  })

  describe('ACTIVE_BREWERY_COOKIE', () => {
    it('exports the correct cookie name', async () => {
      const { ACTIVE_BREWERY_COOKIE } = await import('@/lib/active-brewery')
      expect(ACTIVE_BREWERY_COOKIE).toBe('brewbrain_active_brewery')
    })
  })
})
