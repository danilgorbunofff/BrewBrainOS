// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/batches',
}))

import { PaginationControls } from '@/components/PaginationControls'

describe('PaginationControls', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('returns null when totalCount is 0', () => {
    const { container } = render(
      <PaginationControls currentPage={1} pageSize={20} totalCount={0} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders range summary for first page', () => {
    render(
      <PaginationControls currentPage={1} pageSize={20} totalCount={45} />
    )
    expect(screen.getByText('1–20 of 45')).toBeInTheDocument()
  })

  it('renders range summary for last partial page', () => {
    render(
      <PaginationControls currentPage={3} pageSize={20} totalCount={45} />
    )
    expect(screen.getByText('41–45 of 45')).toBeInTheDocument()
  })

  it('disables "Previous page" on the first page', () => {
    render(
      <PaginationControls currentPage={1} pageSize={20} totalCount={45} />
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables "Next page" on the last page', () => {
    render(
      <PaginationControls currentPage={3} pageSize={20} totalCount={45} />
    )
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('enables both nav buttons on a middle page', () => {
    render(
      <PaginationControls currentPage={2} pageSize={20} totalCount={60} />
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()
  })

  it('navigates to next page on "Next page" click', () => {
    render(
      <PaginationControls currentPage={1} pageSize={20} totalCount={45} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(pushMock).toHaveBeenCalledWith('/batches?page=2&limit=20', { scroll: false })
  })

  it('navigates to previous page on "Previous page" click', () => {
    render(
      <PaginationControls currentPage={2} pageSize={20} totalCount={45} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(pushMock).toHaveBeenCalledWith('/batches?page=1&limit=20', { scroll: false })
  })

  it('shows page counter', () => {
    render(
      <PaginationControls currentPage={2} pageSize={20} totalCount={60} />
    )
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })
})
