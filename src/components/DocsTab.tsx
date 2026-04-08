'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { docsContent, docSections, type DocArticle } from '@/lib/docs-content'
import { DocNodeRenderer } from '@/components/DocNodeRenderer'
import { LucideBookOpen } from 'lucide-react'

export function DocsTab() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const articlesBySection = useMemo(() => {
    const map = new Map<string, DocArticle[]>()
    for (const section of docSections) {
      map.set(
        section,
        docsContent.filter((a) => a.section === section)
      )
    }
    return map
  }, [])

  const activeArticle = activeSlug
    ? docsContent.find((a) => a.slug === activeSlug) ?? null
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
      {/* ── Mobile selector ──────────────────────────────── */}
      <div className="lg:hidden">
        <select
          value={activeSlug ?? ''}
          onChange={(e) => setActiveSlug(e.target.value || null)}
          aria-label="Select documentation article"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-foreground"
        >
          <option value="">Browse all articles</option>
          {docSections.map((section) => (
            <optgroup key={section} label={section}>
              {articlesBySection.get(section)?.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* ── Desktop side nav ─────────────────────────────── */}
      <nav className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-8 space-y-5">
          {docSections.map((section) => (
            <div key={section}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 px-2">
                {section}
              </h3>
              <ul className="space-y-0.5">
                {articlesBySection.get(section)?.map((a) => {
                  const isActive = a.slug === activeSlug
                  return (
                    <li key={a.slug}>
                      <button
                        onClick={() => setActiveSlug(isActive ? null : a.slug)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm font-bold transition-colors text-left',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        )}
                      >
                        <a.icon className="h-3.5 w-3.5 shrink-0" />
                        {a.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Content area ─────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {activeArticle ? (
          <article>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <activeArticle.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
                  {activeArticle.title}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  {activeArticle.description}
                </p>
              </div>
            </div>
            <DocNodeRenderer nodes={activeArticle.content} />
          </article>
        ) : (
          /* ── Landing card grid ────────────────────────── */
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LucideBookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
                  Documentation
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Guides and references for every part of BrewBrain OS.
                </p>
              </div>
            </div>

            {docSections.map((section) => (
              <div key={section}>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                  {section}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {articlesBySection.get(section)?.map((a) => (
                    <button
                      key={a.slug}
                      onClick={() => setActiveSlug(a.slug)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/20 transition-colors text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <a.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {a.title}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {a.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
