import { describe, expect, it } from 'vitest'
import { parseBrewBrainQR } from '@/lib/qr'

describe('parseBrewBrainQR', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

  // ── Happy paths ──

  it('extracts UUID from a full BrewBrain URL', () => {
    expect(
      parseBrewBrainQR(`https://app.brewbrain.io/tank/${VALID_UUID}`)
    ).toBe(VALID_UUID)
  })

  it('extracts UUID from a localhost URL', () => {
    expect(
      parseBrewBrainQR(`http://localhost:3000/tank/${VALID_UUID}`)
    ).toBe(VALID_UUID)
  })

  it('handles a raw UUID string', () => {
    expect(parseBrewBrainQR(VALID_UUID)).toBe(VALID_UUID)
  })

  it('handles uppercase hex in UUID', () => {
    const upper = '550E8400-E29B-41D4-A716-446655440000'
    expect(parseBrewBrainQR(upper)).toBe(upper)
  })

  // ── Rejection cases ──

  it('returns null for empty string', () => {
    expect(parseBrewBrainQR('')).toBeNull()
  })

  it('returns null for arbitrary text', () => {
    expect(parseBrewBrainQR('hello world')).toBeNull()
  })

  it('returns null for a non-UUID value after tank/', () => {
    expect(parseBrewBrainQR('https://app.brewbrain.io/tank/not-a-uuid')).toBeNull()
  })

  it('returns null for path traversal attempt', () => {
    expect(parseBrewBrainQR('https://evil.com/tank/../../admin')).toBeNull()
  })

  it('returns null for partial UUID', () => {
    expect(parseBrewBrainQR('550e8400-e29b-41d4')).toBeNull()
  })

  it('returns null for UUID with extra chars', () => {
    expect(parseBrewBrainQR(`${VALID_UUID}extra`)).toBeNull()
  })

  it('returns null for URL with tank/ but no UUID segment', () => {
    expect(parseBrewBrainQR('https://app.brewbrain.io/tank/')).toBeNull()
  })

  it('returns null for malicious URL with valid-looking but non-UUID slug', () => {
    expect(
      parseBrewBrainQR('https://evil.com/tank/drop-table-tanks')
    ).toBeNull()
  })

  // ── Edge cases ──

  it('extracts UUID when URL has query params', () => {
    expect(
      parseBrewBrainQR(`https://app.brewbrain.io/tank/${VALID_UUID}?foo=bar`)
    ).toBe(VALID_UUID)
  })

  it('extracts UUID when URL has a trailing slash', () => {
    expect(
      parseBrewBrainQR(`https://app.brewbrain.io/tank/${VALID_UUID}/`)
    ).toBe(VALID_UUID)
  })
})
