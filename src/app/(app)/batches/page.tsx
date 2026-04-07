import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LucideClipboardList } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { BatchesExperience } from '@/components/BatchesExperience'
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary'

export const metadata = {
  title: 'Batches | BrewBrain OS',
}

export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function BatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()

  if (!brewery) redirect('/dashboard')

  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 pt-6 md:pt-8 pb-24 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-6 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucideClipboardList className="h-6 w-6 md:h-8 md:w-8 text-primary shadow-primary/20 shadow-2xl" />
            </div>
            Batches
          </h1>
        </div>
        <ClientErrorBoundary
          fallback={
            <div className="glass border border-border rounded-2xl p-6 text-sm text-muted-foreground">
              Batch tools hit a client-side error. Reload the page and retry the action.
            </div>
          }
        >
          <BatchesExperience batches={batches || []} />
        </ClientErrorBoundary>
      </div>
    </div>
  )
}
