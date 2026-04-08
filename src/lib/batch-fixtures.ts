import type { BatchListItem } from '@/types/database'

const FIXTURE_DATE = new Date('2026-04-07T12:00:00.000Z')
const BATCH_STATUSES = ['brewing', 'fermenting', 'conditioning', 'packaging', 'complete'] as const

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().split('T')[0]
}

export function buildBatchFixture(count: number): BatchListItem[] {
  return Array.from({ length: count }, (_, index) => {
    const status = BATCH_STATUSES[index % BATCH_STATUSES.length]

    return {
      id: `fixture-batch-${index + 1}`,
      recipe_name: `Fixture Batch ${String(index + 1).padStart(4, '0')}`,
      status,
      og: 1.044 + ((index % 8) * 0.003),
      fg: status === 'complete' ? 1.008 + ((index % 3) * 0.001) : null,
      created_at: addDays(FIXTURE_DATE, -(index % 120)),
    }
  })
}