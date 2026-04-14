'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LucideMenu, LucideSearch } from 'lucide-react'

interface MobileTopHeaderProps {
  onMenuOpen: () => void
  onSearchOpen: () => void
}

export function MobileTopHeader({ onMenuOpen, onSearchOpen }: MobileTopHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden h-12 bg-sidebar/95 backdrop-blur-2xl border-b border-border flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
      {/* Hamburger */}
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors glove:min-h-[44px] glove:min-w-[44px] flex items-center justify-center"
      >
        <LucideMenu className="h-5 w-5 text-foreground" />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center">
          <Image src="/logo.png" alt="BrewBrain Logo" width={28} height={28} className="h-full w-full object-cover" />
        </div>
        <span className="text-sm font-black tracking-tight text-foreground">BrewBrain</span>
        <span className="text-[8px] font-black text-primary uppercase">OS</span>
      </Link>

      {/* Search */}
      <button
        onClick={onSearchOpen}
        aria-label="Open search"
        className="p-2 -mr-2 rounded-xl hover:bg-secondary/50 transition-colors glove:min-h-[44px] glove:min-w-[44px] flex items-center justify-center"
      >
        <LucideSearch className="h-5 w-5 text-muted-foreground" />
      </button>
    </header>
  )
}
