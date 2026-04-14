// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ── matchMedia mock ──────────────────────────────────────────────────────────
type MQHandler = (e: MediaQueryListEvent) => void

function makeMQMock(matches: boolean) {
  const listeners: MQHandler[] = []
  return {
    matches,
    addEventListener: vi.fn((_: string, fn: MQHandler) => { listeners.push(fn) }),
    removeEventListener: vi.fn((_: string, fn: MQHandler) => {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    }),
    dispatchChange: (nextMatches: boolean) => {
      listeners.forEach(fn => fn({ matches: nextMatches } as MediaQueryListEvent))
    },
  }
}

let lgMQ: ReturnType<typeof makeMQMock>
let mdMQ: ReturnType<typeof makeMQMock>

beforeEach(() => {
  lgMQ = makeMQMock(false)
  mdMQ = makeMQMock(false)

  window.matchMedia = vi.fn((query: string) => {
    if (query === '(min-width: 1024px)') return lgMQ as unknown as MediaQueryList
    if (query === '(min-width: 768px)') return mdMQ as unknown as MediaQueryList
    return makeMQMock(false) as unknown as MediaQueryList
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useTankGridColumns', () => {
  it('returns 4 when lg breakpoint matches', async () => {
    lgMQ = makeMQMock(true)
    window.matchMedia = vi.fn((query) => {
      if (query === '(min-width: 1024px)') return lgMQ as unknown as MediaQueryList
      return makeMQMock(false) as unknown as MediaQueryList
    })
    const { useTankGridColumns } = await import('@/hooks/useTankGridColumns')
    const { result } = renderHook(() => useTankGridColumns())
    expect(result.current).toBe(4)
  })

  it('returns 2 when only md breakpoint matches', async () => {
    lgMQ = makeMQMock(false)
    mdMQ = makeMQMock(true)
    window.matchMedia = vi.fn((query) => {
      if (query === '(min-width: 1024px)') return lgMQ as unknown as MediaQueryList
      if (query === '(min-width: 768px)') return mdMQ as unknown as MediaQueryList
      return makeMQMock(false) as unknown as MediaQueryList
    })
    const { useTankGridColumns } = await import('@/hooks/useTankGridColumns')
    const { result } = renderHook(() => useTankGridColumns())
    expect(result.current).toBe(2)
  })

  it('returns 1 when no breakpoint matches', async () => {
    window.matchMedia = vi.fn(() => makeMQMock(false) as unknown as MediaQueryList)
    const { useTankGridColumns } = await import('@/hooks/useTankGridColumns')
    const { result } = renderHook(() => useTankGridColumns())
    expect(result.current).toBe(1)
  })

  it('updates when lg breakpoint fires a change event', async () => {
    lgMQ = makeMQMock(false)
    mdMQ = makeMQMock(false)
    window.matchMedia = vi.fn((query) => {
      if (query === '(min-width: 1024px)') return lgMQ as unknown as MediaQueryList
      if (query === '(min-width: 768px)') return mdMQ as unknown as MediaQueryList
      return makeMQMock(false) as unknown as MediaQueryList
    })
    const { useTankGridColumns } = await import('@/hooks/useTankGridColumns')
    const { result } = renderHook(() => useTankGridColumns())
    expect(result.current).toBe(1)

    act(() => {
      lgMQ.matches = true
      lgMQ.dispatchChange(true)
    })
    expect(result.current).toBe(4)
  })
})
