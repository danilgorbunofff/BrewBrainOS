// @vitest-environment jsdom

import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

// Capture the onScan callback so we can invoke it in tests
let capturedOnScan: ((codes: Array<{ rawValue: string }>) => void) | null = null

vi.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: () => {
      // Return a stub component that captures onScan
      const Stub = (props: { onScan?: typeof capturedOnScan }) => {
        capturedOnScan = props.onScan ?? null
        return <div data-testid="qr-scanner-stub" />
      }
      Stub.displayName = 'DynamicStub'
      return Stub
    },
  }
})

import { QRScanner } from '@/components/QRScanner'

beforeEach(() => {
  vi.clearAllMocks()
  capturedOnScan = null
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

function renderAndActivate() {
  render(<QRScanner />)
  // Advance past the 250ms delayed init
  act(() => { vi.advanceTimersByTime(300) })
}

describe('QRScanner', () => {
  it('renders processing state initially', () => {
    render(<QRScanner />)
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('navigates to tank page on valid URL scan', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([{ rawValue: `https://app.brewbrain.io/tank/${VALID_UUID}` }])
    })

    expect(toastSuccessMock).toHaveBeenCalledWith('Tank recognized. Loading profile...')
    expect(pushMock).toHaveBeenCalledWith(`/tank/${VALID_UUID}`)
  })

  it('navigates to tank page on raw UUID scan', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([{ rawValue: VALID_UUID }])
    })

    expect(toastSuccessMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith(`/tank/${VALID_UUID}`)
  })

  it('shows error toast for invalid QR code', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([{ rawValue: 'https://evil.com/not-a-tank' }])
    })

    expect(toastErrorMock).toHaveBeenCalledWith('Invalid BrewBrain QR code detected.')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('rejects path traversal in QR code', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([{ rawValue: 'https://evil.com/tank/../../admin' }])
    })

    expect(toastErrorMock).toHaveBeenCalledWith('Invalid BrewBrain QR code detected.')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('ignores scan when detectedCodes is empty', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([])
    })

    expect(pushMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('re-enables scanning after 2 seconds on invalid code', () => {
    renderAndActivate()

    act(() => {
      capturedOnScan?.([{ rawValue: 'invalid' }])
    })

    expect(toastErrorMock).toHaveBeenCalled()

    // After 2s, scanning should re-enable (no crash)
    act(() => { vi.advanceTimersByTime(2100) })
  })
})
