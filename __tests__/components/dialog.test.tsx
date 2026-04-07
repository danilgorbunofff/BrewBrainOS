// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

describe('dialog primitives', () => {
  it('renders the dialog content, overlay, and close actions', () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory sync</DialogTitle>
            <DialogDescription>Review the queued changes before continuing.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <button type="button">Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Inventory sync')).toBeInTheDocument()
    expect(screen.getByText('Review the queued changes before continuing.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2)
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
  })

  it('supports hiding built-in close buttons and rendering a custom close control', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Custom dialog</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<button type="button">Dismiss</button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Custom dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})