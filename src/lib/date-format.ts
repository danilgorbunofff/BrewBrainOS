/**
 * Stable date-formatting helpers for client components.
 *
 * Using `undefined` (system locale) in `toLocaleDateString` / `toLocaleString`
 * inside SSR'd client components causes hydration mismatches because the server
 * locale differs from the browser locale.  These helpers fix that by using an
 * explicit locale so the string produced during SSR and during client hydration
 * is identical.
 */

const SHORT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
}

const SHORT_DATE_YEAR_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

const SHORT_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

/**
 * "Apr 14" — month + day only.
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', SHORT_DATE_OPTS)
}

/**
 * "Apr 14, 2026" — month + day + year.
 */
export function formatShortDateYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', SHORT_DATE_YEAR_OPTS)
}

/**
 * "Apr 14, 10:00 AM" — month + day + time.
 */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', SHORT_DATETIME_OPTS)
}
