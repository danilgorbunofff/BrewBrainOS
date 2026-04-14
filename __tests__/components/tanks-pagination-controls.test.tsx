// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/tanks',
}))

// Default: match lg breakpoint so columns = 4
vi.mock('@/hooks/useTankGridColumns', () => ({
  useTankGridColumns: vi.fn(() => 4),
}))

import { TanksPaginationControls, TANK_PAGE_SIZES } from '@/components/TanksPaginationControls'
import { useTankGridColumns } from '@/hooks/useTankGridColumns'

describe('TanksPaginationControls', () => {
  beforeEach(() => {
    pushMock.mockReset()
    replaceMock.mockReset()
    vi.mocked(useTankGridColumns).mockReturnValue(4)
  })

  it('all TANK_PAGE_SIZES are multiples of 4', () => {
    for (const size of TANK_PAGE_SIZES) {
      expect(size % 4).toBe(0)
    }
  })

  it('renders the per-page selector and page counter', () => {
    render(
      <TanksPaginationControls currentPage={1} pageSize={20} totalCount={50} />
    )
    expect(screen.getByLabelText('Items per page')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('shows correct range on the first page', () => {
    render(
      <TanksPaginationControls currentPage={1} pageSize={12} totalCount={25} />
    )
    expect(screen.getByText('1–12 of 25')).toBeInTheDocument()
  })

  it('does not auto-correct when pageSize is already column-aligned', () => {
    render(
      <TanksPaginationControls currentPage={1} pageSize={12} totalCount={25} />
    )
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('auto-corrects to next aligned size when columns change makes pageSize misaligned', () => {
    // columns = 4, pageSize = 10 (not a multiple of 4) → should correct to 12
    vi.mocked(useTankGridColumns).mockReturnValue(4)
    render(
      <TanksPaginationControls currentPage={1} pageSize={10} totalCount={50} />
    )
    expect(replaceMock).toHaveBeenCalledWith('/tanks?page=1&limit=12', { scroll: false })
  })

  it('returns null when totalCount is 0', () => {
    const { container } = render(
      <TanksPaginationControls currentPage={1} pageSize={20} totalCount={0} />
    )
    expect(container.firstChild).toBeNull()
  })
})
