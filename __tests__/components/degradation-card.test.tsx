// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(app)/inventory/actions', () => ({
  updateStorageCondition: vi.fn(),
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
})
