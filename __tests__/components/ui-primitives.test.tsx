// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

describe('card primitives', () => {
  it('renders the full card composition with small-size styling hooks', () => {
    render(
      <Card size="sm" className="custom-card">
        <img src="/test.png" alt="Card cover" />
        <CardHeader className="card-header">
          <CardTitle>Inventory health</CardTitle>
          <CardDescription>Current component quality metrics.</CardDescription>
          <CardAction>
            <button type="button">Inspect</button>
          </CardAction>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    )

    expect(screen.getByText('Inventory health')).toBeInTheDocument()
    expect(screen.getByText('Current component quality metrics.')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByText('Footer actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect' })).toBeInTheDocument()

    const card = document.querySelector('[data-slot="card"]')
    expect(card).toHaveAttribute('data-size', 'sm')
    expect(card).toHaveClass('custom-card')
    expect(document.querySelector('[data-slot="card-action"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="card-description"]')).not.toBeNull()
  })
})

describe('table primitives', () => {
  it('renders table sections, cells, footer, and caption with the provided classes', () => {
    render(
      <Table className="metrics-table">
        <TableCaption>Batch metrics overview</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>OG</TableCell>
            <TableCell>1.055</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1 row</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('Batch metrics overview')).toBeInTheDocument()
    expect(screen.getByText('OG')).toBeInTheDocument()
    expect(screen.getByText('1.055')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="table-container"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="table"]')).toHaveClass('metrics-table')
    expect(document.querySelector('[data-slot="table-footer"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="table-caption"]')).not.toBeNull()
  })
})