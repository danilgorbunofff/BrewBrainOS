// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SearchFilter } from '@/components/SearchFilter'

type SearchItem = {
  name: string
  type: string
  batchCount: number
}

const items: SearchItem[] = [
  { name: 'Citra IPA', type: 'Ale', batchCount: 12 },
  { name: 'Pilsner Pilot', type: 'Lager', batchCount: 4 },
  { name: 'Amber Wave', type: 'Ale', batchCount: 6 },
]

describe('SearchFilter', () => {
  it('renders all items before a query is entered', () => {
    render(
      <SearchFilter items={items} searchKeys={['name', 'type']} placeholder="Search recipes">
        {(filteredItems, query) => (
          <div>
            <p>query:{query || 'empty'}</p>
            <p>count:{filteredItems.length}</p>
            <ul>
              {filteredItems.map((item) => (
                <li key={item.name}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </SearchFilter>
    )

    expect(screen.getByPlaceholderText('Search recipes')).toBeInTheDocument()
    expect(screen.getByText('query:empty')).toBeInTheDocument()
    expect(screen.getByText('count:3')).toBeInTheDocument()
    expect(screen.getByText('Citra IPA')).toBeInTheDocument()
    expect(screen.getByText('Pilsner Pilot')).toBeInTheDocument()
    expect(screen.getByText('Amber Wave')).toBeInTheDocument()
  })

  it('filters items case-insensitively across the configured search keys', () => {
    render(
      <SearchFilter items={items} searchKeys={['name', 'type']}>
        {(filteredItems, query) => (
          <div>
            <p>query:{query || 'empty'}</p>
            <p>count:{filteredItems.length}</p>
            <ul>
              {filteredItems.map((item) => (
                <li key={item.name}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </SearchFilter>
    )

    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'ale' } })

    expect(screen.getByText('query:ale')).toBeInTheDocument()
    expect(screen.getByText('count:2')).toBeInTheDocument()
    expect(screen.getByText('Citra IPA')).toBeInTheDocument()
    expect(screen.getByText('Amber Wave')).toBeInTheDocument()
    expect(screen.queryByText('Pilsner Pilot')).not.toBeInTheDocument()
  })

  it('returns all items when the query is only whitespace', () => {
    render(
      <SearchFilter items={items} searchKeys={['name', 'type']}>
        {(filteredItems) => <p>count:{filteredItems.length}</p>}
      </SearchFilter>
    )

    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: '   ' } })

    expect(screen.getByText('count:3')).toBeInTheDocument()
  })
})