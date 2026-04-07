import { afterEach, describe, expect, it, vi } from 'vitest'

import { cn, isUniqueViolationFor, sanitizeDbError } from '@/lib/utils'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('utils', () => {
  it('merges class names with tailwind conflict resolution', () => {
    expect(cn('px-2', false && 'hidden', 'px-4', 'text-sm')).toBe('px-4 text-sm')
  })

  it('detects unique violations with and without a hint', () => {
    expect(isUniqueViolationFor({ code: '23505', message: 'duplicate key value' })).toBe(true)
    expect(
      isUniqueViolationFor(
        { code: '23505', details: 'Key (email)=(ops@brewbrain.test) already exists.' },
        'email'
      )
    ).toBe(true)
    expect(
      isUniqueViolationFor(
        { code: '23505', details: 'Key (email)=(ops@brewbrain.test) already exists.' },
        'lot_number'
      )
    ).toBe(false)
  })

  it('sanitizes permission-related database errors', () => {
    expect(sanitizeDbError({ code: '42501', message: 'permission denied for table inventory' })).toBe(
      "You don't have permission to perform this action."
    )

    expect(
      sanitizeDbError({ message: 'new row violates row-level security policy for table inventory' })
    ).toBe("You don't have permission to perform this action.")
  })

  it('suppresses raw postgres-style errors but preserves safe application errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(sanitizeDbError(new Error('duplicate key value violates unique constraint'))).toBe(
      'A database error occurred. Please try again.'
    )
    expect(sanitizeDbError(new Error('Batch already exists'))).toBe('Batch already exists')
    expect(sanitizeDbError('unexpected')).toBe('An unexpected error occurred. Please try again.')
  })
})