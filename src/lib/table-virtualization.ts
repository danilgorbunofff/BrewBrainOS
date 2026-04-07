export const DEFAULT_VIRTUAL_THRESHOLD = 100

export function shouldVirtualizeRows(rowCount: number, threshold = DEFAULT_VIRTUAL_THRESHOLD) {
  return rowCount > threshold
}

export function mergeVirtualRangeIndexes(visibleIndexes: number[], persistentIndexes: number[]) {
  const mergedIndexes = new Set(visibleIndexes)

  for (const index of persistentIndexes) {
    if (index >= 0) {
      mergedIndexes.add(index)
    }
  }

  return [...mergedIndexes].sort((left, right) => left - right)
}