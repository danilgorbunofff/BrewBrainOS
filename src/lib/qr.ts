const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Parse a raw QR code value and extract a valid tank UUID.
 *
 * Accepted formats:
 *  - Absolute URL containing `/tank/{uuid}` (e.g. `https://app.brewbrain.io/tank/abc-123…`)
 *  - Raw UUID string
 *
 * Returns the tank UUID if valid, or `null` for any unrecognised / malicious input.
 */
export function parseBrewBrainQR(rawValue: string): string | null {
  if (!rawValue) return null

  // Try absolute-URL format first
  if (rawValue.includes('tank/')) {
    const match = rawValue.match(/tank\/([a-zA-Z0-9-]+)/)
    const candidate = match?.[1]
    if (candidate && UUID_RE.test(candidate)) return candidate
  }

  // Raw UUID fallback
  if (UUID_RE.test(rawValue)) return rawValue

  return null
}
