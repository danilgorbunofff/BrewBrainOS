// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
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
})