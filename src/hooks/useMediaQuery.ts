'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe hook that tracks a CSS media query.
 * Returns `false` during SSR and on the first client render,
 * then updates reactively when the viewport crosses the breakpoint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Returns `true` when the viewport is below the `md` breakpoint (< 768px). */
export function useMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
