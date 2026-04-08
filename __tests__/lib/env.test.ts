import { afterEach, describe, expect, it } from 'vitest'

import { getRequiredEnv } from '../../src/lib/env'

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

describe('getRequiredEnv', () => {
  afterEach(() => {
    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    }

    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
    }
  })

  it('points missing public env errors to local and CI setup paths', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    expect(() => getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', 'public')).toThrowError(
      'Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local for local work, or configure the same NEXT_PUBLIC_* value in deployment or CI before building. Run npm run verify:env to validate the public build prerequisites.'
    )
  })

  it('points missing server env errors to the server verification command', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(() => getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY', 'server')).toThrowError(
      'Missing required server-only environment variable: SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local for local work, or configure the matching server-only secret in deployment or CI before starting protected flows. Run npm run verify:env:server to validate critical server runtime secrets.'
    )
  })

  it('rejects dynamic public env names that are not in the client-safe map', () => {
    expect(() => getRequiredEnv('NEXT_PUBLIC_UNKNOWN_FLAG', 'public')).toThrowError(
      'Unsupported public environment variable lookup: NEXT_PUBLIC_UNKNOWN_FLAG. Add it to src/lib/env.ts so Next.js can expose it safely to client bundles.'
    )
  })
})