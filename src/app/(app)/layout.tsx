import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { OfflineSyncBanner } from '@/components/OfflineSyncBanner'
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

  const { data: brewery } = await supabase
    .from('breweries')
    .select('name')
    .eq('owner_id', user.id)
    .single()

  return (
    <>
      <OfflineSyncBanner />
      <div className="min-h-screen flex max-w-[100vw] overflow-x-hidden md:mt-0 mt-8">
      <Sidebar
        userEmail={user.email || ''}
        breweryName={brewery?.name || null}
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
