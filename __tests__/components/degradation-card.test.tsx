// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { mockUpdateStorageCondition } = vi.hoisted(() => ({
  mockUpdateStorageCondition: vi.fn(),
}))

vi.mock('@/app/(app)/inventory/actions', () => ({
  updateStorageCondition: mockUpdateStorageCondition,
  updateDegradationMetrics: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { DegradationCard } from '@/components/DegradationCard'
import type { InventoryItem } from '@/types/database'

const BASE_ITEM: InventoryItem = {
  id: 'item-1',
  brewery_id: 'brewery-1',
  name: 'Cascade Hops',
  item_type: 'Hops',
  current_stock: 10,
  unit: 'kg',
  reorder_point: 2,
  lot_number: null,
  expiration_date: null,
  manufacturer: null,
  received_date: '2026-04-14',
  storage_condition: 'cool_dry',
  hsi_initial: 100,
  hsi_current: 99,
  grain_moisture_initial: null,
  grain_moisture_current: null,
  ppg_initial: null,
  ppg_current: null,
  degradation_tracked: true,
  last_degradation_calc: '2026-04-14T00:00:00Z',
  supplier_id: null,
  notes: null,
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
}

describe('DegradationCard', () => {
  it('renders the item name and health status', () => {
    render(<DegradationCard item={BASE_ITEM} />)
    expect(screen.getByText('Cascade Hops')).toBeInTheDocument()
  })

  it('shows the friendly storage condition label in closed (non-editing) state', () => {
    render(<DegradationCard item={BASE_ITEM} />)
    expect(screen.getByText('🧊 Cool & Dry (Ideal)')).toBeInTheDocument()
    expect(screen.queryByText('cool_dry')).not.toBeInTheDocument()
  })

  it('shows the friendly storage condition label in edit mode trigger, not the raw key', () => {
    render(<DegradationCard item={BASE_ITEM} />)

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit storage condition/i }))

    // The trigger should show the friendly label via the STORAGE_CONDITION_LABELS map
    expect(screen.getByText('🧊 Cool & Dry (Ideal)')).toBeInTheDocument()
    expect(screen.queryByText('cool_dry')).not.toBeInTheDocument()
  })

  it('renders all four storage condition friendly labels in the dropdown when open', () => {
    render(<DegradationCard item={BASE_ITEM} />)
    fireEvent.click(screen.getByRole('button', { name: /edit storage condition/i }))

    // Open the dropdown
    const trigger = document.querySelector('[data-slot="select-trigger"]')
    if (trigger) fireEvent.click(trigger)

    // All items should display friendly text — none of the raw keys
    ;['cool_dry', 'cool_humid', 'room_temp', 'warm'].forEach((rawKey) => {
      // raw key must not appear as a visible item text
      const el = screen.queryByText(rawKey)
      expect(el).toBeNull()
    })
  })

  it('shows different condition label after simulating warm selection in edit mode', () => {
    render(<DegradationCard item={{ ...BASE_ITEM, storage_condition: 'warm' }} />)
    expect(screen.getByText('🔥 Warm (Poor)')).toBeInTheDocument()
    expect(screen.queryByText('warm')).not.toBeInTheDocument()
  })

  it('renders HSI metric when hsi_initial > 0', () => {
    render(<DegradationCard item={BASE_ITEM} />)
    expect(screen.getByText('Hop HSI')).toBeInTheDocument()
    expect(screen.getByText('99.0%')).toBeInTheDocument()
  })

  it('renders grain moisture metric when grain_moisture_initial is present', () => {
    const item: InventoryItem = {
      ...BASE_ITEM,
      item_type: 'Grain',
      grain_moisture_initial: 10,
      grain_moisture_current: 11.5,
      hsi_initial: null,
      hsi_current: null,
    }
    render(<DegradationCard item={item} />)
    expect(screen.getByText('Grain Moisture')).toBeInTheDocument()
    expect(screen.getByText('11.5%')).toBeInTheDocument()
  })

  it('renders PPG loss metric when ppg_initial and ppg_current are present', () => {
    const item: InventoryItem = {
      ...BASE_ITEM,
      ppg_initial: 37,
      ppg_current: 35,
      hsi_initial: null,
      hsi_current: null,
    }
    render(<DegradationCard item={item} />)
    expect(screen.getByText('PPG Loss')).toBeInTheDocument()
    // (37-35)/37 * 100 = 5.4%
    expect(screen.getByText(/-5\.4%/)).toBeInTheDocument()
  })

  it('shows degraded badge for degraded items', () => {
    // HSI < 50 triggers degraded
    const item: InventoryItem = {
      ...BASE_ITEM,
      hsi_current: 40,
    }
    render(<DegradationCard item={item} />)
    expect(screen.getByText(/Degraded/i)).toBeInTheDocument()
  })

  it('does not call API when confirming without changing condition', async () => {
    render(<DegradationCard item={BASE_ITEM} />)

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit storage condition/i }))

    // Click confirm without changing the value — should early-return
    fireEvent.click(screen.getByRole('button', { name: /confirm storage condition/i }))

    // Should NOT have called the API since value didn't change
    expect(mockUpdateStorageCondition).not.toHaveBeenCalled()

    // Should exit edit mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit storage condition/i })).toBeInTheDocument()
    })
  })

  it('cancel button exits edit mode without calling API', () => {
    render(<DegradationCard item={BASE_ITEM} />)

    fireEvent.click(screen.getByRole('button', { name: /edit storage condition/i }))
    expect(screen.getByRole('button', { name: /cancel storage condition edit/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cancel storage condition edit/i }))

    // Should be back to non-editing state
    expect(screen.getByRole('button', { name: /edit storage condition/i })).toBeInTheDocument()
    expect(mockUpdateStorageCondition).not.toHaveBeenCalled()
  })

  it('shows received date', () => {
    render(<DegradationCard item={BASE_ITEM} />)
    // The date should be displayed
    expect(screen.getByText(/Received:/)).toBeInTheDocument()
  })
})
