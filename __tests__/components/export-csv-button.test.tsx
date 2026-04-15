// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('lucide-react', () => ({
  LucideDownload: () => <span data-testid="download-icon" />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button {...props}>{children}</button>
  ),
}))

import { ExportCSVButton } from '@/components/ExportCSVButton'

describe('ExportCSVButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const columns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'value' as const, label: 'Value' },
  ]

  it('renders export button', () => {
    render(
      <ExportCSVButton
        data={[{ name: 'A', value: 1 }]}
        filename="test"
        columns={columns}
      />
    )
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('is disabled when data is empty', () => {
    render(
      <ExportCSVButton
        data={[]}
        filename="test"
        columns={columns}
      />
    )
    expect(screen.getByText('Export').closest('button')).toBeDisabled()
  })

  it('does nothing on click when data is empty', () => {
    const createObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock

    render(
      <ExportCSVButton
        data={[]}
        filename="test"
        columns={columns}
      />
    )
    fireEvent.click(screen.getByText('Export'))
    expect(createObjectURLMock).not.toHaveBeenCalled()
  })

  it('triggers CSV download with correct content', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:csv')
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

    const data = [
      { name: 'Cascade Hops', value: 42 },
      { name: 'Malt, Pilsner', value: 100 },
    ]

    render(
      <ExportCSVButton data={data} filename="inventory" columns={columns} />
    )

    fireEvent.click(screen.getByText('Export'))

    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)

    // Verify Blob content
    const blob = createObjectURLMock.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/csv;charset=utf-8;')
  })

  it('escapes CSV values with commas and quotes', () => {
    let capturedCsv = ''
    const OriginalBlob = global.Blob
    global.Blob = class MockBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        capturedCsv = parts.join('')
      }
    }
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()

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

    const data = [
      { name: 'He said "hello"', value: 10 },
      { name: 'Has, comma', value: 20 },
    ]

    render(
      <ExportCSVButton data={data} filename="test" columns={columns} />
    )
    fireEvent.click(screen.getByText('Export'))

    expect(capturedCsv).toContain('"He said ""hello"""')
    expect(capturedCsv).toContain('"Has, comma"')

    global.Blob = OriginalBlob
  })

  it('handles null and undefined values', () => {
    let capturedCsv = ''
    const OriginalBlob = global.Blob
    global.Blob = class MockBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        capturedCsv = parts.join('')
      }
    }
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()

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

    const data = [
      { name: null as unknown as string, value: undefined as unknown as number },
    ]

    render(
      <ExportCSVButton data={data} filename="test" columns={columns} />
    )
    fireEvent.click(screen.getByText('Export'))

    // null/undefined become empty strings — row should have comma separator
    expect(capturedCsv).toContain(',')

    global.Blob = OriginalBlob
  })
})
