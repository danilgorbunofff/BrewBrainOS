import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TankLimitBadge, TankAddGate } from '@/components/TankLimitGate'
import { TanksGrid } from '@/components/TanksGrid'
import { LucideWaves } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'

export const metadata = {
  title: 'Vessels | BrewBrain OS',
}

export default async function TanksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const brewery = await getActiveBrewery()

  if (!brewery) {
    redirect('/dashboard')
  }

  const { count: tankCount } = await supabase
    .from('tanks')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', brewery.id)

  const currentTankCount = tankCount || 0

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideWaves className="h-8 w-8 text-primary shadow-primary/20 shadow-2xl" />
              </div>
              Vessels
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-zinc-500 font-medium">Monitoring and allocation of fermentation infrastructure.</p>
              <TankLimitBadge currentCount={currentTankCount} />
            </div>
          </div>
        </div>

        <RealtimeRefresh table="tanks" breweryId={brewery.id} />

        <Suspense fallback={<TanksSkeleton />}>
          <TanksContent breweryId={brewery.id} currentTankCount={currentTankCount} />
        </Suspense>

      </div>
    </div>
  )
}

async function TanksContent({ breweryId, currentTankCount }: { breweryId: string; currentTankCount: number }) {
  const supabase = await createClient()

  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('brewery_id', breweryId)
    .order('name')

  return (
    <TankAddGate currentCount={currentTankCount}>
      <TanksGrid tanks={tanks ?? []} />
    </TankAddGate>
  )
}

function TanksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      ))}
    </div>
  )
}
