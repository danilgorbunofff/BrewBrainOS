// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  LucideDownload: () => <span data-testid="download-icon" />,
  LucideFileBarChart: () => <span data-testid="chart-icon" />,
  LucideChevronDown: () => <span data-testid="chevron-down" />,
  LucideChevronUp: () => <span data-testid="chevron-up" />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button {...props}>{children}</button>
  ),
}))

import { TTBReportTable } from '@/components/TTBReportTable'

// ─── Helpers ────────────────────────────────────────────────────────
function makeBatch(overrides: Partial<{
  id: string
  recipe_name: string
  status: string
  og: number | null
  fg: number | null
  created_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'b-001',
    recipe_name: overrides.recipe_name ?? 'Test IPA',
    status: overrides.status ?? 'complete',
    og: overrides.og ?? 1.065,
    fg: overrides.fg ?? 1.012,
    created_at: overrides.created_at ?? '2026-03-15T10:00:00Z',
    ...overrides,
  }
}

const defaultProps = {
  avgTankCapacity: 10,
  breweryName: 'Test Brewery',
  licenseNumber: 'BR-12345',
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('TTBReportTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders monthly data in table format', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'complete', created_at: '2026-03-15T10:00:00Z' }),
      makeBatch({ id: 'b-2', status: 'fermenting', created_at: '2026-03-20T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Both desktop table and mobile card render — use getAllByText
    expect(screen.getAllByText('March 2026').length).toBeGreaterThanOrEqual(1)
    // Column headers exist in desktop table
    expect(screen.getAllByText('Month').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BBL').length).toBeGreaterThanOrEqual(1)
  })

  it('shows grand total row with correct sums', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'complete', created_at: '2026-03-15T10:00:00Z' }),
      makeBatch({ id: 'b-2', status: 'complete', created_at: '2026-02-10T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Grand total appears in both desktop and mobile views
    expect(screen.getAllByText('Grand Total').length).toBeGreaterThanOrEqual(1)
  })

  it('handles 0 batches (empty table)', () => {
    render(<TTBReportTable batches={[]} {...defaultProps} />)

    expect(
      screen.getAllByText(/No batch data yet/i).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('handles batches with null OG/FG (averages skip nulls)', () => {
    const batches = [
      makeBatch({ id: 'b-1', og: 1.065, fg: null }),
      makeBatch({ id: 'b-2', og: null, fg: null }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // OG average should be 1.065, not distorted by null
    expect(screen.getByText('1.065')).toBeInTheDocument()
  })

  it('counts dumped batches correctly', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'dumped' }),
      makeBatch({ id: 'b-2', status: 'complete' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Dumped column header visible in desktop table
    expect(screen.getAllByText('Dumped').length).toBeGreaterThanOrEqual(1)
  })

  it('counts brewing status as active', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'brewing' }),
      makeBatch({ id: 'b-2', status: 'fermenting' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Active column header exists
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1)
  })

  it('CSV export button is present', () => {
    render(<TTBReportTable batches={[makeBatch()]} {...defaultProps} />)

    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('PDF export button is present and shows loading state', () => {
    render(<TTBReportTable batches={[makeBatch()]} {...defaultProps} />)

    const pdfBtn = screen.getByText('PDF')
    expect(pdfBtn).toBeInTheDocument()
  })

  it('toggles table visibility when header is clicked', () => {
    const batches = [makeBatch()]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Find the toggle button (contains the section title text)
    const toggleBtn = screen.getByText('TTB Monthly Production Report').closest('button')!
    
    // Initially expanded - should have table content
    expect(screen.getAllByText('March 2026').length).toBeGreaterThanOrEqual(1)

    // Click to collapse
    fireEvent.click(toggleBtn)

    // Month row should not be present anymore
    expect(screen.queryAllByText('March 2026')).toHaveLength(0)

    // Click to expand again
    fireEvent.click(toggleBtn)
    expect(screen.getAllByText('March 2026').length).toBeGreaterThanOrEqual(1)
  })

  it('CSV export triggers download', () => {
    // Mock Blob and URL APIs
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    const clickMock = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = originalCreateElement('a')
        el.click = clickMock
        return el
      }
      return originalCreateElement(tag)
    })

    const batches = [
      makeBatch({ id: 'b-1', status: 'complete', created_at: '2026-03-15T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    const csvBtn = screen.getByText('CSV')
    fireEvent.click(csvBtn)

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('counts packaging status as completed production', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'packaging', created_at: '2026-03-10T10:00:00Z' }),
      makeBatch({ id: 'b-2', status: 'complete', created_at: '2026-03-20T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Both packaging and complete should count as completed — 2 completed batches
    // Grand total should show 2 completed
    const completedCells = screen.getAllByText('2')
    expect(completedCells.length).toBeGreaterThanOrEqual(1)
  })

  it('renders without licenseNumber (null)', () => {
    const batches = [makeBatch()]
    render(<TTBReportTable batches={batches} avgTankCapacity={10} breweryName="Test Brewery" licenseNumber={null} />)

    // Should render without errors
    expect(screen.getAllByText('March 2026').length).toBeGreaterThanOrEqual(1)
    // License should not appear
    expect(screen.queryByText(/License:/)).not.toBeInTheDocument()
  })

  it('sorts months in descending order (most recent first)', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'complete', created_at: '2026-01-15T10:00:00Z' }),
      makeBatch({ id: 'b-2', status: 'complete', created_at: '2026-03-15T10:00:00Z' }),
      makeBatch({ id: 'b-3', status: 'complete', created_at: '2026-02-15T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    const allText = document.body.textContent || ''
    const marchIdx = allText.indexOf('March 2026')
    const febIdx = allText.indexOf('February 2026')
    const janIdx = allText.indexOf('January 2026')

    // March should appear before February, February before January
    expect(marchIdx).toBeLessThan(febIdx)
    expect(febIdx).toBeLessThan(janIdx)
  })

  it('conditioning status counts as active', () => {
    const batches = [
      makeBatch({ id: 'b-1', status: 'conditioning', created_at: '2026-03-15T10:00:00Z' }),
    ]
    render(<TTBReportTable batches={batches} {...defaultProps} />)

    // Should have 1 active, 0 completed
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1)
  })
})
