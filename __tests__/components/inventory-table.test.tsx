// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(app)/inventory/actions', () => ({
  updateStock: vi.fn(),
  deleteInventoryItem: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/components/DeleteConfirmButton', () => ({
  DeleteConfirmButton: ({ itemName }: { itemName: string }) => (
    <button aria-label={`Delete ${itemName}`}>Delete</button>
  ),
}))

vi.mock('@/components/AddInventoryItemDialog', () => ({
  AddInventoryItemDialog: () => <button>Add Item</button>,
}))

import { InventoryTable } from '@/components/InventoryTable'

interface TestItem {
  id: string
  name: string
  item_type: string
  current_stock: number
  unit: string
  reorder_point: number | null
  lot_number?: string | null
  expiration_date?: string | null
  manufacturer?: string | null
  hsi_current?: number | null
  grain_moisture_current?: number | null
  ppg_initial?: number | null
  ppg_current?: number | null
}

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    id: 'item-1',
    name: 'Cascade Hops',
    item_type: 'Hops',
    current_stock: 50,
    unit: 'lbs',
    reorder_point: 10,
    lot_number: null,
    expiration_date: null,
    manufacturer: null,
    hsi_current: null,
    grain_moisture_current: null,
    ppg_initial: null,
    ppg_current: null,
    ...overrides,
  }
}

describe('InventoryTable', () => {
  it('renders items with correct columns', () => {
    const items = [
      makeItem({ id: '1', name: 'Cascade', item_type: 'Hops', current_stock: 25 }),
      makeItem({ id: '2', name: 'Pilsner Malt', item_type: 'Grain', current_stock: 300 }),
    ]
    render(<InventoryTable items={items} />)

    expect(screen.getAllByText('Cascade').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pilsner Malt').length).toBeGreaterThan(0)
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('search filters by name (case-insensitive)', () => {
    const items = [
      makeItem({ id: '1', name: 'Cascade Hops', item_type: 'Hops' }),
      makeItem({ id: '2', name: 'Pilsner Malt', item_type: 'Grain' }),
      makeItem({ id: '3', name: 'US-05 Yeast', item_type: 'Yeast' }),
    ]
    render(<InventoryTable items={items} />)

    const searchInput = screen.getByLabelText('Inventory search')
    fireEvent.change(searchInput, { target: { value: 'cascade' } })

    expect(screen.getByText('1 item found')).toBeInTheDocument()
    expect(screen.getAllByText('Cascade Hops').length).toBeGreaterThan(0)
    expect(screen.queryByText('Pilsner Malt')).not.toBeInTheDocument()
  })

  it('shows category tabs matching InventoryType', () => {
    render(<InventoryTable items={[]} />)
    const tabList = screen.getByRole('tablist', { name: 'Inventory categories' })
    const tabs = within(tabList).getAllByRole('tab')
    const tabNames = tabs.map(t => t.textContent)

    expect(tabNames).toEqual(['All', 'Hops', 'Grain', 'Yeast', 'Adjunct', 'Packaging'])
  })

  it('shows degradation badges for HSI', () => {
    const items = [
      makeItem({ id: '1', name: 'Old Hops', item_type: 'Hops', hsi_current: 45 }),
    ]
    render(<InventoryTable items={items} />)

    expect(screen.getAllByText(/HSI 45%/i).length).toBeGreaterThan(0)
  })

  it('shows grain moisture badge', () => {
    const items = [
      makeItem({ id: '1', name: 'Wet Grain', item_type: 'Grain', grain_moisture_current: 14.5 }),
    ]
    render(<InventoryTable items={items} />)

    expect(screen.getAllByText(/14\.5%/i).length).toBeGreaterThan(0)
  })

  it('shows PPG loss badge when loss exceeds 5%', () => {
    const items = [
      makeItem({ id: '1', name: 'Degraded Grain', item_type: 'Grain', ppg_initial: 37, ppg_current: 33 }),
    ]
    render(<InventoryTable items={items} />)

    // PPG loss = (37-33)/37 * 100 = 10.8% → should show badge
    expect(screen.getAllByText(/PPG -10\.8%/i).length).toBeGreaterThan(0)
  })

  it('shows stock adjustment buttons with accessibility labels', () => {
    const items = [
      makeItem({ id: '1', name: 'Cascade', item_type: 'Hops', current_stock: 50, unit: 'lbs' }),
    ]
    render(<InventoryTable items={items} />)

    expect(screen.getAllByLabelText(/Decrease Cascade stock by 1 lbs/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/Increase Cascade stock by 1 lbs/i).length).toBeGreaterThan(0)
  })

  it('shows delete button per item', () => {
    const items = [
      makeItem({ id: '1', name: 'Cascade', item_type: 'Hops' }),
    ]
    render(<InventoryTable items={items} />)

    expect(screen.getAllByLabelText(/Delete Cascade/i).length).toBeGreaterThan(0)
  })

  it('shows empty state when no items', () => {
    render(<InventoryTable items={[]} />)
    expect(screen.getAllByText('Empty Silos').length).toBeGreaterThan(0)
  })

  it('shows empty state for search with no results', () => {
    const items = [
      makeItem({ id: '1', name: 'Cascade', item_type: 'Hops' }),
    ]
    render(<InventoryTable items={items} />)

    const searchInput = screen.getByLabelText('Inventory search')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    expect(screen.getAllByText('No matches').length).toBeGreaterThan(0)
  })

  it('CSV export button is rendered', () => {
    const items = [makeItem({ id: '1', name: 'Test' })]
    render(<InventoryTable items={items} />)

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('uses standard table when items below virtual threshold', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `item-${i}`, name: `Item ${i}` }),
    )
    render(<InventoryTable items={items} />)

    // Should use standard table (not virtual)
    expect(document.querySelector('[data-testid="inventory-standard-table"]')).toBeTruthy()
    expect(document.querySelector('[data-testid="inventory-virtual-table"]')).toBeFalsy()
  })

  it('highlights low stock items', () => {
    const items = [
      makeItem({ id: '1', name: 'Low Stock Hops', current_stock: 5, reorder_point: 10 }),
    ]
    render(<InventoryTable items={items} />)

    // Should show "Reorder Required" indicator
    expect(screen.getAllByText(/Reorder Required/i).length).toBeGreaterThan(0)
  })
})
