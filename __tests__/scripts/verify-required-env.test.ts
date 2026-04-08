import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { verifyRequiredEnv } from '../../scripts/verify-required-env.mjs'

const originalNodeEnv = process.env.NODE_ENV
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function restoreEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

describe('verifyRequiredEnv', () => {
  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }

    restoreEnv('NEXT_PUBLIC_SUPABASE_URL', originalSupabaseUrl)
    restoreEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', originalSupabaseAnonKey)
  })

  it('loads values from .env.local before checking the build profile', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NODE_ENV = 'development'

    const projectDir = mkdtempSync(path.join(os.tmpdir(), 'brewbrain-env-'))

    try {
      writeFileSync(
        path.join(projectDir, '.env.local'),
        [
          'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY=example-anon-key',
          '',
        ].join('\n')
      )

      expect(verifyRequiredEnv('build', projectDir)).toEqual({
        ok: true,
        profileName: 'build',
        missing: [],
      })
    } finally {
      rmSync(projectDir, { recursive: true, force: true })
    }
  })

  it('reports missing values when no local env file provides them', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NODE_ENV = 'development'

    const projectDir = mkdtempSync(path.join(os.tmpdir(), 'brewbrain-env-empty-'))

    try {
      expect(verifyRequiredEnv('build', projectDir)).toEqual({
        ok: false,
        profileName: 'build',
        missing: [
          ['NEXT_PUBLIC_SUPABASE_URL', 'required for Next.js production builds'],
          ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'required for Supabase browser and server clients'],
        ],
      })
    } finally {
      rmSync(projectDir, { recursive: true, force: true })
    }
  })
})