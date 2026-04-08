// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DevTools } from '@/components/DevTools'

vi.mock('@/app/(app)/dev-actions', () => ({
  setDevSubscriptionTier: vi.fn(async () => ({ success: true })),
  seedScenario: vi.fn(async () => ({ success: true })),
  seedRandomScenario: vi.fn(async () => ({ success: true, seed: 'fixture-seed' })),
  nuclearReset: vi.fn(async () => ({ success: true })),
  seedMockBatches: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/app/(app)/dev/actions.server', () => ({
  simulateIotReading: vi.fn(async () => ({ success: true })),
  simulateIotBurst: vi.fn(async () => ({ success: true })),
  triggerFermentationAlertCron: vi.fn(async () => ({ success: true })),
  seedLargeDataset: vi.fn(async () => ({ success: true })),
  seedDegradationScenario: vi.fn(async () => ({ success: true })),
  seedFermentationAlerts: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/app/actions/push-actions', () => ({
  sendTestNotification: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/offlineQueue', () => ({
  getOfflineQueue: vi.fn(async () => []),
  clearOfflineQueue: vi.fn(async () => 0),
  enqueueAction: vi.fn(async () => 1),
  processQueue: vi.fn(async () => 0),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('DevTools', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as Window & { __devFixture?: unknown }).__devFixture
  })

  it('exposes the dev fixture API including random scenario seeding', async () => {
    const { unmount } = render(<DevTools activeBreweryId="brewery-1" currentTier="free" />)

    expect(screen.getByRole('button', { name: /open dev tools/i })).toBeInTheDocument()

    await waitFor(() => {
      expect((window as Window & { __devFixture?: Record<string, unknown> }).__devFixture).toBeDefined()
    })

    const fixture = (window as Window & { __devFixture?: Record<string, unknown> }).__devFixture
    expect(fixture?.seedRandomScenario).toBeTypeOf('function')
    expect(fixture?.seedScenario).toBeTypeOf('function')

    unmount()

    expect((window as Window & { __devFixture?: unknown }).__devFixture).toBeUndefined()
  })
})