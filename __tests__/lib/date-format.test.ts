import { describe, expect, it } from 'vitest'
import {
  formatShortDate,
  formatShortDateYear,
  formatShortDateTime,
} from '@/lib/date-format'

const ISO = '2026-04-14T10:00:00.000Z'

describe('formatShortDate', () => {
  it('returns month and day with explicit en-US locale', () => {
    // Must be stable regardless of host locale
    const result = formatShortDate(ISO)
    expect(result).toMatch(/^Apr \d{1,2}$/)
    expect(result).toBe('Apr 14')
  })
})

describe('formatShortDateYear', () => {
  it('returns month, day, and year with explicit en-US locale', () => {
    const result = formatShortDateYear(ISO)
    expect(result).toMatch(/^Apr \d{1,2}, \d{4}$/)
    expect(result).toBe('Apr 14, 2026')
  })
})

describe('formatShortDateTime', () => {
  it('returns month, day, and time', () => {
    const result = formatShortDateTime(ISO)
    // Time varies by UTC offset of the test runner; just assert structure
    expect(result).toMatch(/^Apr \d{1,2},/)
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)$/)
  })
})
