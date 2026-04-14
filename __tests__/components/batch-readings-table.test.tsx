// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/batches/batch-123',
}))

import { BatchReadingsTable } from '@/components/BatchReadingsTable'
import type { BatchReading } from '@/types/database'

function makeReading(overrides: Partial<BatchReading> = {}): BatchReading {
  return {
    id: crypto.randomUUID(),
    batch_id: 'batch-123',
    brewery_id: 'brewery-1',
    temperature: 18.5,
    gravity: 1.05,
    ph: 4.6,
    dissolved_oxygen: 0.08,
    pressure: 8.0,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as BatchReading
}

const READINGS = Array.from({ length: 5 }, (_, i) =>
  makeReading({ id: `reading-${i}`, notes: `note ${i}` })
)

describe('BatchReadingsTable', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('shows empty state when totalCount is 0', () => {
    render(
      <BatchReadingsTable
        readings={[]}
        currentPage={1}
        pageSize={5}
        totalCount={0}
      />
    )
    expect(screen.getByText(/no readings yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the table rows for the current page', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={1}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBe(READINGS.length + 1) // +1 for thead
  })

  it('shows the correct range summary', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={1}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByText('1–5 of 13')).toBeInTheDocument()
  })

  it('shows the correct range summary on page 3', () => {
    render(
      <BatchReadingsTable
        readings={READINGS.slice(0, 3)}
        currentPage={3}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByText('11–13 of 13')).toBeInTheDocument()
  })

  it('shows page counter', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={2}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('disables the previous button on page 1', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={1}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
  })

  it('disables the next button on the last page', () => {
    render(
      <BatchReadingsTable
        readings={READINGS.slice(0, 3)}
        currentPage={3}
        pageSize={5}
        totalCount={13}
      />
    )
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
  })

  it('navigates to the next page when next is clicked', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={1}
        pageSize={5}
        totalCount={13}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(pushMock).toHaveBeenCalledWith('/batches/batch-123?page=2&limit=5', { scroll: false })
  })

  it('navigates to the previous page when prev is clicked', () => {
    render(
      <BatchReadingsTable
        readings={READINGS}
        currentPage={2}
        pageSize={5}
        totalCount={13}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }))
    expect(pushMock).toHaveBeenCalledWith('/batches/batch-123?page=1&limit=5', { scroll: false })
  })
})
