// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActivityLog } from '@/components/ActivityLog'
import type { ActivityEntry } from '@/components/ActivityLog'

const mockActivities: ActivityEntry[] = [
  {
    id: 'b-1',
    type: 'batch',
    label: 'Batch "Hazy IPA"',
    detail: 'Status: fermenting',
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'r-1',
    type: 'reading',
    label: 'Voice Reading Logged',
    detail: 'Gravity: 1.048 • Temp: 18.5°',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 't-1',
    type: 'tank',
    label: 'Tank "FV-01" registered',
    detail: 'Status: fermenting',
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'b-2',
    type: 'batch',
    label: 'Batch "Stout"',
    detail: 'Status: conditioning',
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
]

describe('ActivityLog', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders only the first 3 activities in the summary card', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText('Batch "Hazy IPA"')).toBeInTheDocument()
    expect(screen.getByText('Voice Reading Logged')).toBeInTheDocument()
    expect(screen.getByText('Tank "FV-01" registered')).toBeInTheDocument()
    // 4th row must NOT appear in the card
    expect(screen.queryByText('Batch "Stout"')).not.toBeInTheDocument()
  })

  it('shows an empty state when activities list is empty', () => {
    render(<ActivityLog activities={[]} />)
    expect(screen.getByText(/No recent activity recorded/i)).toBeInTheDocument()
  })

  it('renders the "View all" button', () => {
    render(<ActivityLog activities={mockActivities} />)
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument()
  })

  it('opens the modal and fetches logs when "View all" is clicked', async () => {
    const allLogs: ActivityEntry[] = [
      ...mockActivities,
      {
        id: 'inv-1',
        type: 'inventory',
        label: 'Inventory item "Cascade Hops"',
        detail: 'Type: hops',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
    ]
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ activities: allLogs }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<ActivityLog activities={mockActivities} />)
    fireEvent.click(screen.getByRole('button', { name: /view all/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/activity-logs?type=all&limit=100')
    )

    await waitFor(() =>
      expect(screen.getByText('Inventory item "Cascade Hops"')).toBeInTheDocument()
    )
    // All 4 mock entries should be visible in the modal (not just the 3 in preview)
    expect(screen.getAllByText('Batch "Hazy IPA"')).toBeTruthy()
  })

  it('shows the filter tabs inside the modal', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ activities: mockActivities }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<ActivityLog activities={mockActivities} />)
    fireEvent.click(screen.getByRole('button', { name: /view all/i }))

    await waitFor(() => expect(screen.getByRole('group', { name: /filter activity by type/i })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Batches' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Readings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tanks' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('re-fetches with the selected filter type when a filter button is clicked', async () => {
    const batchLogs: ActivityEntry[] = [mockActivities[0], mockActivities[3]]
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ activities: mockActivities }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ activities: batchLogs }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

    render(<ActivityLog activities={mockActivities} />)
    fireEvent.click(screen.getByRole('button', { name: /view all/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/activity-logs?type=all&limit=100')
    )

    fireEvent.click(screen.getByRole('button', { name: 'Batches' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/activity-logs?type=batch&limit=100')
    )
  })

  it('shows an error message when the fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))

    render(<ActivityLog activities={mockActivities} />)
    fireEvent.click(screen.getByRole('button', { name: /view all/i }))

    await waitFor(() =>
      expect(screen.getByText(/Could not load activity logs/i)).toBeInTheDocument()
    )
  })
})
