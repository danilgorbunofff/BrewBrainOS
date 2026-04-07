const MAX_IDEMPOTENCY_KEY_LENGTH = 255

function normalizePart(value: string | number | boolean) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createStripeIdempotencyKey(
  scope: string,
  ...parts: Array<string | number | boolean | null | undefined>
) {
  const key = [
    'brewbrain',
    normalizePart(scope),
    ...parts
      .filter((part): part is string | number | boolean => part != null)
      .map(normalizePart)
      .filter(Boolean),
  ].join(':')

  return key.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH)
}