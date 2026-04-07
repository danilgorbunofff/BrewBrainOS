'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LucideLayoutDashboard, LucideWaves, LucideClipboardList,
  LucidePackageSearch, LucideQrCode, LucideSettings,
  LucideX, LucideSearch, LucideFileBarChart, LucideCreditCard,
  LucideTrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GloveModeToggle } from '@/components/GloveModeToggle'
import { MobileFloatingActions } from '@/components/MobileFloatingActions'
import { BrewerySwitcher } from '@/components/BrewerySwitcher'
import { VoiceLogger } from '@/components/VoiceLogger'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard },
  { label: 'Analytics', href: '/analytics', icon: LucideTrendingUp },
  { label: 'Vessels', href: '/tanks', icon: LucideWaves },
  { label: 'Batches', href: '/batches', icon: LucideClipboardList },
  { label: 'Inventory', href: '/inventory', icon: LucidePackageSearch },
  { label: 'QR Scan', href: '/scan', icon: LucideQrCode },
  { label: 'Reports', href: '/reports', icon: LucideFileBarChart },
  { label: 'Billing', href: '/billing', icon: LucideCreditCard },
]

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: LucideSettings },
]

interface BrewerySummary {
  id: string
  name: string
  license_number: string | null
  subscription_tier?: string
}

interface SidebarProps {
  userEmail: string
  breweryName: string | null
  breweries: BrewerySummary[]
  activeBreweryId: string | null
}

export function Sidebar({ userEmail, breweryName, breweries, activeBreweryId }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const initials = userEmail.substring(0, 2).toUpperCase()

  return (
    <>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[260px] bg-sidebar/95 backdrop-blur-2xl border-r border-border flex flex-col transition-transform duration-300 ease-out',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
            <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-shadow">
              <Image src="/logo.png" alt="BrewBrain Logo" width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-foreground">BrewBrain</span>
              <span className="text-[10px] font-black text-primary ml-1 uppercase">OS</span>
            </div>
          </Link>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <LucideX className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Brewery Switcher */}
        <BrewerySwitcher 
          breweries={breweries} 
          activeBreweryId={activeBreweryId} 
          activeBreweryName={breweryName}
        />

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                )}
              >
                <item.icon className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-muted-foreground'
                )} />
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            )
          })}

          {/* AI Voice Interface - Desktop Only prominent button */}
          <div className="pt-4 mt-2 border-t border-border">
            <VoiceLogger variant="sidebar" />
          </div>
        </nav>

        {/* Cmd+K Hint */}
        <div className="mx-3 mb-2">
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:bg-secondary transition-colors group"
          >
            <LucideSearch className="h-3.5 w-3.5 text-muted-foreground group-hover:text-muted-foreground" />
            <span className="text-xs text-muted-foreground group-hover:text-muted-foreground font-medium flex-1 text-left">Search…</span>
            <kbd className="text-[9px] font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
          </button>
        </div>

        {/* Bottom Section */}
        <div className="px-3 pb-3 space-y-1 border-t border-border pt-3">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                )}
              >
                <item.icon className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-muted-foreground'
                )} />
                {item.label}
              </Link>
            )
          })}

          {/* User Pill */}
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-surface border border-border">
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-primary">{initials}</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-foreground truncate">{userEmail}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active</p>
            </div>
            <div className="flex items-center gap-1">
              <GloveModeToggle className="h-7 w-7 text-muted-foreground" />
              <ThemeToggle className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-sidebar/95 backdrop-blur-2xl border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {[...navItems.slice(0, 4), { label: 'More', href: '/settings', icon: LucideSettings }].map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href + '-mobile'}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[3rem]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-bold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile floating Voice + QR buttons */}
      <MobileFloatingActions />
    </>
  )
}
