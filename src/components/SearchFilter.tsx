'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { LucideSearch } from 'lucide-react'

interface SearchFilterProps<T> {
  items: T[]
  searchKeys: (keyof T)[]
  children: (filteredItems: T[], searchQuery: string) => React.ReactNode
  placeholder?: string
}

export function SearchFilter<T>({
  items,
  searchKeys,
  children,
  placeholder = 'Search…',
}: SearchFilterProps<T>) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(item =>
      searchKeys.some(key => {
        const val = item[key]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }, [items, query, searchKeys])

  return (
    <>
      <div className="relative">
        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 bg-surface border-border font-medium text-sm h-10 rounded-xl"
        />
      </div>
      {children(filtered, query)}
    </>
  )
}
