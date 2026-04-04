'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LucideLayoutDashboard, LucideWaves, LucideClipboardList,
  LucidePackageSearch, LucideQrCode, LucideSettings, LucideSearch,
  LucideFileBarChart
} from 'lucide-react'

const pages = [
  { name: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard, keywords: 'home main overview' },
  { name: 'Vessels / Tanks', href: '/tanks', icon: LucideWaves, keywords: 'fermenter brite tank vessel' },
  { name: 'Batches', href: '/batches', icon: LucideClipboardList, keywords: 'batch recipe production brew' },
  { name: 'Inventory', href: '/inventory', icon: LucidePackageSearch, keywords: 'stock hops grain yeast material' },
  { name: 'QR Scanner', href: '/scan', icon: LucideQrCode, keywords: 'scan qr code camera' },
  { name: 'TTB Reports', href: '/reports', icon: LucideFileBarChart, keywords: 'ttb compliance report production bbl fsma sanitation' },
  { name: 'Settings', href: '/settings', icon: LucideSettings, keywords: 'profile account preferences' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setOpen(false)}
      />

      {/* Command Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg animate-in fade-in slide-in-from-top-4 duration-200">
        <Command className="rounded-2xl border border-border bg-popover/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <LucideSearch className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search pages, actions…"
              className="w-full h-14 bg-transparent text-popover-foreground placeholder-muted-foreground outline-none text-sm font-medium"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary border border-border px-2 py-1 rounded-md shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground font-medium">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2">
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`${page.name} ${page.keywords}`}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground cursor-pointer transition-colors data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                >
                  <page.icon className="h-4 w-4 shrink-0" />
                  {page.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground">BrewBrain OS</span>
            <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}
