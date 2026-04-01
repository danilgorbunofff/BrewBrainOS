import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { OfflineSyncBanner } from '@/components/OfflineSyncBanner'
import { SubscriptionProvider } from '@/components/SubscriptionProvider'
import { getActiveBrewery, getUserBreweries } from '@/lib/active-brewery'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all breweries + active one
  const [breweries, activeBrewery] = await Promise.all([
    getUserBreweries(),
    getActiveBrewery(),
  ])

  // Fetch subscription data for the provider
  let subscription = null
  if (activeBrewery) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier, status, white_glove_paid, current_period_end')
      .eq('brewery_id', activeBrewery.id)
      .single()
    subscription = sub
  }

  return (
    <>
      <OfflineSyncBanner />
      <SubscriptionProvider subscription={subscription}>
        <div className="min-h-screen flex max-w-[100vw] overflow-x-hidden md:mt-0 mt-8">
        <Sidebar
          userEmail={user.email || ''}
          breweryName={activeBrewery?.name || null}
          breweries={breweries}
          activeBreweryId={activeBrewery?.id || null}
        />
        <CommandPalette />
        {/* Main content area — pushed right past sidebar */}
        <main className="flex-1 md:ml-[260px] min-h-screen max-w-[100vw] overflow-x-hidden">
          {children}
        </main>
        </div>
      </SubscriptionProvider>
    </>
  )
}
