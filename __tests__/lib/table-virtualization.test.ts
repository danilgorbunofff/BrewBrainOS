import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIRTUAL_THRESHOLD,
  mergeVirtualRangeIndexes,
  shouldVirtualizeRows,
} from '../../src/lib/table-virtualization'

describe('table virtualization thresholds', () => {
  it('keeps normal rendering at or below the default threshold', () => {
    expect(shouldVirtualizeRows(DEFAULT_VIRTUAL_THRESHOLD - 1)).toBe(false)
    expect(shouldVirtualizeRows(DEFAULT_VIRTUAL_THRESHOLD)).toBe(false)
  })

  it('switches to virtualization above the default threshold', () => {
    expect(shouldVirtualizeRows(DEFAULT_VIRTUAL_THRESHOLD + 1)).toBe(true)
    expect(shouldVirtualizeRows(1000)).toBe(true)
  })

  it('supports custom thresholds for denser tables', () => {
    expect(shouldVirtualizeRows(60, 50)).toBe(true)
    expect(shouldVirtualizeRows(60, 75)).toBe(false)
  })

  it('merges persistent virtual indexes into the visible range', () => {
    expect(mergeVirtualRangeIndexes([10, 11, 12], [1, 12, 30])).toEqual([1, 10, 11, 12, 30])
  })

  it('ignores invalid persistent indexes when merging ranges', () => {
    expect(mergeVirtualRangeIndexes([4, 5], [-1, 5, -10])).toEqual([4, 5])
  })
})