// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useTierCheckMock } = vi.hoisted(() => ({
  useTierCheckMock: vi.fn(),
}))

vi.mock('@/components/UpgradeGate', () => ({
  useTierCheck: useTierCheckMock,
}))

vi.mock('@/lib/offlineQueue', () => ({
  enqueueAction: vi.fn(),
}))

vi.mock('@/app/actions/voice', () => ({
  processVoiceLog: vi.fn(),
}))

import { VoiceLogger } from '@/components/VoiceLogger'

describe('VoiceLogger sidebar variant', () => {
  it('contains overflow on the button wrapper to prevent horizontal scrollbar in sidebar', () => {
    useTierCheckMock.mockReturnValue(true)

    const { container } = render(<VoiceLogger variant="sidebar" />)

    // The wrapper div that holds the aura and the button must have overflow-hidden
    // to prevent blur-lg + scale-125 on the aura from creating horizontal overflow
    // in the sidebar's overflow-y:auto nav container.
    const buttonWrapper = container.querySelector('.relative.group.w-full.flex.justify-center')
    expect(buttonWrapper).not.toBeNull()
    expect(buttonWrapper?.classList.contains('overflow-hidden')).toBe(true)
  })

  it('renders the Record Log button for premium users', () => {
    useTierCheckMock.mockReturnValue(true)

    render(<VoiceLogger variant="sidebar" />)

    expect(screen.getByText('Record Log')).toBeInTheDocument()
  })

  it('renders locked state for non-premium users', () => {
    useTierCheckMock.mockReturnValue(false)

    render(<VoiceLogger variant="sidebar" />)

    expect(screen.getByText('AI Voice Locked')).toBeInTheDocument()
  })
})
