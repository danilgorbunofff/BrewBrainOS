'use client'

import { useEffect, useState } from 'react'

// Mirrors the TanksGrid breakpoints: lg:grid-cols-4, md:grid-cols-2, else 1
const BREAKPOINTS = [
  { query: '(min-width: 1024px)', cols: 4 },
  { query: '(min-width: 768px)', cols: 2 },
] as const

function getCurrentCols(): number {
  if (typeof window === 'undefined') return 4
  for (const { query, cols } of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return cols
  }
  return 1
}

/**
 * Returns the number of columns currently rendered by TanksGrid.
 * Updates reactively when the viewport crosses the lg/md breakpoints.
 */
export function useTankGridColumns(): number {
  const [columns, setColumns] = useState(getCurrentCols)

  useEffect(() => {
    const mqs = BREAKPOINTS.map(({ query }) => window.matchMedia(query))
    const handler = () => setColumns(getCurrentCols())
    mqs.forEach(mq => mq.addEventListener('change', handler))
    return () => mqs.forEach(mq => mq.removeEventListener('change', handler))
  }, [])

  return columns
}
