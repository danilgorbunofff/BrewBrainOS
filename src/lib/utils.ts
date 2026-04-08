import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────
// SERVER ACTION ERROR SANITIZATION
// ─────────────────────────────────────────────

/**
 * Supabase / PostgreSQL error codes that indicate RLS or permission issues.
 * These must never expose raw DB messages to the client.
 */
const RLS_ERROR_CODES = new Set(['42501', 'PGRST301', '42P01', '23503', '23505'])

export function isUniqueViolationFor(err: unknown, hint?: string): boolean {
  const asAny = err as Record<string, unknown>
  const code = asAny?.code as string | undefined

  if (code !== '23505') {
    return false
  }

  if (!hint) {
    return true
  }

  const combined = [asAny?.message, asAny?.details, asAny?.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  return combined.includes(hint.toLowerCase())
}

/**
 * Converts any thrown value into a safe, user-facing error string.
 * Raw Supabase/PostgreSQL error messages are suppressed and replaced
 * with a generic message so internal schema details are never leaked.
 */
export function sanitizeDbError(err: unknown, context?: string): string {
  // Handle plain Error objects that may carry Supabase error codes
  const asAny = err as Record<string, unknown>
  const code = asAny?.code as string | undefined
  const message = asAny?.message as string | undefined

  if (code && RLS_ERROR_CODES.has(code)) {
    return "You don't have permission to perform this action."
  }

  // "permission denied" or "row-level security" appearing in the message
  if (
    typeof message === 'string' &&
    (message.includes('row-level security') ||
      message.includes('permission denied') ||
      message.includes('violates row-level security'))
  ) {
    return "You don't have permission to perform this action."
  }

  // Known safe, application-level errors thrown intentionally with new Error(...)
  // are safe to surface if they don't look like DB internals.
  if (err instanceof Error) {
    const msg = err.message
    // Block any postgres-style messages that slipped through
    if (
      msg.startsWith('ERROR:') ||
      msg.includes('duplicate key') ||
      msg.includes('violates foreign key') ||
      msg.includes('null value in column')
    ) {
      console.error(`[${context ?? 'action'}] suppressed DB error:`, err)
      return 'A database error occurred. Please try again.'
    }
    return msg
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Converts any thrown value into a proper JS Error instance.
 * Supabase's PostgrestError is a plain object with no `.stack`, which causes
 * React 19's dev-mode fake-call-stack builder to crash. Always throw the
 * result of this function instead of a raw Supabase error.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value

  if (typeof value === 'string') return new Error(value)

  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string'
  ) {
    const msg = (value as Record<string, unknown>).message as string
    const err = new Error(msg)
    const code = (value as Record<string, unknown>).code
    if (code !== undefined) {
      Object.assign(err, { code })
    }
    return err
  }

  return new Error(String(value))
}
