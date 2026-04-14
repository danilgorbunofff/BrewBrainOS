// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/components/AddInventoryItemDialog', () => ({
  AddInventoryItemDialog: () => <div data-testid="add-inventory-item-dialog" />,
}))

vi.mock('@/components/AddBatchForm', () => ({
  AddBatchForm: () => <div data-testid="add-batch-form" />,
}))

vi.mock('@/components/DeleteConfirmButton', () => ({
  DeleteConfirmButton: () => <button type="button">Delete inventory item</button>,
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => <button type="button">Delete batch</button>,
}))

vi.mock('@/components/ExportCSVButton', () => ({
  ExportCSVButton: () => <button type="button">Export CSV</button>,
}))

vi.mock('@/app/(app)/inventory/actions', () => ({
  updateStock: vi.fn(async () => undefined),
  deleteInventoryItem: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/app/(app)/batches/actions', () => ({
  deleteBatch: vi.fn(async () => ({ success: true })),
}))

import { BatchesTable } from '@/components/BatchesTable'
import { InventoryTable } from '@/components/InventoryTable'
import { updateStock } from '@/app/(app)/inventory/actions'

function buildInventoryItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `inventory-${index + 1}`,
    name: `Inventory ${index + 1}`,
    item_type: 'Hops',
    current_stock: 20 + index,
    unit: 'kg',
    reorder_point: 5,
  }))
}

function buildBatches(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `batch-${index + 1}`,
    recipe_name: `Batch ${index + 1}`,
    status: 'fermenting',
    og: 1.055,
    fg: null,
    created_at: '2026-04-07',
  }))
}

describe('InventoryTable', () => {
  it('keeps the desktop table in standard mode below the virtualization threshold', () => {
    render(<InventoryTable items={buildInventoryItems(24)} />)

    expect(screen.getAllByTestId('inventory-standard-table').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('inventory-virtual-table')).toHaveLength(0)
  })

  it('switches to the virtualized desktop table above the threshold', () => {
    render(<InventoryTable items={buildInventoryItems(140)} />)

    expect(screen.getAllByTestId('inventory-virtual-table').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('inventory-virtual-scroll').length).toBeGreaterThan(0)
  })

  it('submits stock adjustment actions and exercises virtual-row focus handlers', { timeout: 15_000 }, () => {
    render(<InventoryTable items={buildInventoryItems(140)} />)

    const firstDeleteButton = screen.getAllByRole('button', { name: /delete inventory item/i })[0]
    fireEvent.focus(firstDeleteButton)
    fireEvent.blur(firstDeleteButton, { relatedTarget: document.body })

    const decreaseForm = firstDeleteButton.previousElementSibling?.previousElementSibling as HTMLFormElement | null
    const increaseForm = firstDeleteButton.previousElementSibling as HTMLFormElement | null

    expect(decreaseForm).not.toBeNull()
    expect(increaseForm).not.toBeNull()

    fireEvent.submit(decreaseForm as HTMLFormElement)
    fireEvent.submit(increaseForm as HTMLFormElement)

    expect(updateStock).toHaveBeenCalledTimes(2)
  })

  it('renders empty-state CTAs when no inventory items match', () => {
    render(<InventoryTable items={[]} />)

    expect(screen.getAllByText('Empty Silos').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('add-inventory-item-dialog').length).toBeGreaterThan(0)
  })

  it('renders expiration and degradation indicators for detailed inventory items', () => {
    render(
      <InventoryTable
        items={[
          {
            id: 'inventory-expired',
            name: 'Old Hops',
            item_type: 'Hops',
            current_stock: 2,
            unit: 'kg',
            reorder_point: 5,
            expiration_date: '2026-04-01T00:00:00.000Z',
            hsi_current: 40,
          },
          {
            id: 'inventory-expiring',
            name: 'Fresh Grain',
            item_type: 'Grain',
            current_stock: 12,
            unit: 'kg',
            reorder_point: 4,
            expiration_date: '2026-04-20T00:00:00.000Z',
            grain_moisture_current: 14.2,
            ppg_initial: 37,
            ppg_current: 30,
          },
        ]}
      />
    )

    expect(screen.getAllByText(/expired/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/expires in/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/HSI 40%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/PPG -18\.9%/).length).toBeGreaterThan(0)
  })

  it('renders the icon zone placeholder on every row regardless of alert state', () => {
    render(
      <InventoryTable
        items={[
          {
            id: 'inventory-no-alerts',
            name: 'Healthy Grain',
            item_type: 'Grain',
            current_stock: 50,
            unit: 'kg',
            reorder_point: 5,
          },
          {
            id: 'inventory-low-stock',
            name: 'Low Hops',
            item_type: 'Hops',
            current_stock: 1,
            unit: 'kg',
            reorder_point: 5,
          },
          {
            id: 'inventory-expiring',
            name: 'Expiring Yeast',
            item_type: 'Yeast',
            current_stock: 10,
            unit: 'packs',
            reorder_point: 2,
            expiration_date: '2026-04-20T00:00:00.000Z',
          },
        ]}
      />
    )

    // Every row renders the fixed icon zone placeholder — three items × two layouts (desktop + mobile)
    const iconZones = screen.getAllByTestId('inventory-icon-zone')
    expect(iconZones.length).toBeGreaterThanOrEqual(3)
  })

  it('expands lot information on the mobile inventory card', () => {
    render(
      <InventoryTable
        items={[
          {
            id: 'inventory-1',
            name: 'Cascade Pellets',
            item_type: 'Hops',
            current_stock: 8,
            unit: 'kg',
            reorder_point: 3,
            lot_number: 'LOT-42',
            manufacturer: 'Yakima Chief',
            expiration_date: '2026-07-01T00:00:00.000Z',
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /lot information/i }))

    expect(screen.getByText('LOT-42')).toBeInTheDocument()
    expect(screen.getByText('Yakima Chief')).toBeInTheDocument()
  })
})

describe('BatchesTable', () => {
  it('renders the standard desktop table for smaller batch lists', () => {
    render(<BatchesTable batches={buildBatches(24)} />)

    expect(screen.getByTestId('batches-standard-table')).toBeInTheDocument()
    expect(screen.queryByTestId('batches-virtual-table')).not.toBeInTheDocument()
  })

  it('renders the virtualized desktop table for larger batch lists', () => {
    render(<BatchesTable batches={buildBatches(140)} />)

    expect(screen.getByTestId('batches-virtual-table')).toBeInTheDocument()
    expect(screen.getByTestId('batches-virtual-scroll')).toBeInTheDocument()
  })

  it('exercises virtual batch-row focus handlers on large lists', () => {
    render(<BatchesTable batches={buildBatches(140)} />)

    const firstDeleteButton = screen.getAllByRole('button', { name: /delete batch/i })[0]
    fireEvent.focus(firstDeleteButton)
    fireEvent.blur(firstDeleteButton, { relatedTarget: document.body })

    expect(screen.getByTestId('batches-virtual-table')).toBeInTheDocument()
  })

  it('renders the empty state and opens the add-batch dialog when no batches exist', () => {
    render(<BatchesTable batches={[]} />)

    expect(screen.getAllByText('Empty Logbook').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: /start a batch/i })[0])

    expect(screen.getByText('Start a New Batch')).toBeInTheDocument()
    expect(screen.getByTestId('add-batch-form')).toBeInTheDocument()
  })

  it('filters batches by search query and shows a no-match empty state', () => {
    render(<BatchesTable batches={buildBatches(4)} />)

    fireEvent.change(screen.getByPlaceholderText('Search batches by name or status…'), {
      target: { value: 'nonexistent' },
    })

    expect(screen.getByText('0 batches found')).toBeInTheDocument()
    expect(screen.getAllByText('No matches').length).toBeGreaterThan(0)
  })

  it('renders status-specific batch details and mobile cards', () => {
    render(
      <BatchesTable
        batches={[
          {
            id: 'batch-packaging',
            recipe_name: 'Packaging Run',
            status: 'packaging',
            og: 1.06,
            fg: 1.012,
            created_at: '2026-04-07T00:00:00.000Z',
          },
          {
            id: 'batch-complete',
            recipe_name: 'Finished Lager',
            status: 'complete',
            og: 1.048,
            fg: null,
            created_at: '2026-04-06T00:00:00.000Z',
          },
          {
            id: 'batch-conditioning',
            recipe_name: 'Cellar Hold',
            status: 'conditioning',
            og: 1.05,
            fg: 1.01,
            created_at: '2026-04-05T00:00:00.000Z',
          },
          {
            id: 'batch-dumped',
            recipe_name: 'Failed Pilot',
            status: 'dumped',
            og: null,
            fg: null,
            created_at: '2026-04-04T00:00:00.000Z',
          },
          {
            id: 'batch-custom',
            recipe_name: 'Queued Barrel',
            status: 'queued',
            og: 1.042,
            fg: null,
            created_at: '2026-04-03T00:00:00.000Z',
          },
        ]}
      />
    )

    expect(screen.getAllByText('Packaging Run').length).toBeGreaterThan(0)
    expect(screen.getAllByText('packaging').length).toBeGreaterThan(0)
    expect(screen.getAllByText('complete').length).toBeGreaterThan(0)
    expect(screen.getAllByText('conditioning').length).toBeGreaterThan(0)
    expect(screen.getAllByText('dumped').length).toBeGreaterThan(0)
    expect(screen.getAllByText('queued').length).toBeGreaterThan(0)
    expect(screen.getAllByText('--').length).toBeGreaterThan(0)
  })
})