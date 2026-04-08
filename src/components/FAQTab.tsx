'use client'

import { useState, useMemo } from 'react'
import { LucideSearch, LucideChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { faqContent, type FAQQuestion } from '@/lib/faq-content'

interface FlatQuestion extends FAQQuestion {
  category: string
}

export function FAQTab() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => faqContent.map((s) => s.category),
    []
  )

  const allQuestions: FlatQuestion[] = useMemo(
    () =>
      faqContent.flatMap((s) =>
        s.questions.map((q) => ({ ...q, category: s.category }))
      ),
    []
  )

  const filtered = useMemo(() => {
    let items = allQuestions

    if (activeCategory) {
      items = items.filter((item) => item.category === activeCategory)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q)
      )
    }

    return items
  }, [allQuestions, query, activeCategory])

  // Group filtered results by category for display
  const grouped = useMemo(() => {
    const map = new Map<string, FlatQuestion[]>()
    for (const item of filtered) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions\u2026"
          aria-label="Search FAQ"
          className="pl-10 bg-surface border-border font-medium text-sm h-10 rounded-xl"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border',
            activeCategory === null
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:border-border'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border',
              activeCategory === cat
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:border-border'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground font-medium">
            No questions match your search. Try a different query.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([category, questions]) => (
            <section key={category}>
              <h2 className="text-lg font-black tracking-tight text-foreground font-heading mb-4">
                {category}
              </h2>
              <div className="space-y-3">
                {questions.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-border bg-card/60 hover:bg-card transition-colors"
                  >
                    <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                      <span className="text-sm font-bold text-foreground">
                        {item.q}
                      </span>
                      <LucideChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
