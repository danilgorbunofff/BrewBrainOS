'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { MobileTopHeader } from '@/components/MobileTopHeader'

interface BrewerySummary {
  id: string
  name: string
  license_number: string | null
  subscription_tier?: string
}

interface AppShellClientProps {
  userEmail: string
  breweryName: string | null
  breweries: BrewerySummary[]
  activeBreweryId: string | null
  children: React.ReactNode
}

export function AppShellClient({
  userEmail,
  breweryName,
  breweries,
  activeBreweryId,
  children,
}: AppShellClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const openSearch = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    )
  }, [])

  return (
    <>
      <MobileTopHeader
        onMenuOpen={() => setMobileOpen(true)}
        onSearchOpen={openSearch}
      />
      <div className="min-h-screen flex max-w-[100vw] overflow-x-hidden md:mt-0 mt-12">
        <Sidebar
          userEmail={userEmail}
          breweryName={breweryName}
          breweries={breweries}
          activeBreweryId={activeBreweryId}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <CommandPalette />
        {/* Main content area — pushed right past sidebar */}
        <main className="flex-1 md:ml-[260px] min-h-screen max-w-[100vw] overflow-x-hidden">
          {children}
        </main>
      </div>
    </>
  )
}
