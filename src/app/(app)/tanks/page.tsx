import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TankLimitBadge, TankAddGate } from '@/components/TankLimitGate'
import { TanksGrid } from '@/components/TanksGrid'
import { LucideWaves, LucidePrinter } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import { TanksPaginationControls } from '@/components/TanksPaginationControls'

export const metadata = {
  title: 'Vessels | BrewBrain OS',
}

// Multiples of 4: fill rows on lg (4-col) and md (2-col) grids.
// Keep in sync with TANK_PAGE_SIZES in TanksPaginationControls.tsx.
const ALLOWED_PAGE_SIZES = [4, 8, 12, 16, 20, 24] as const
const DEFAULT_PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string; limit?: string }>
}

export default async function TanksPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const brewery = await getActiveBrewery()

  if (!brewery) {
    redirect('/dashboard')
  }

  const { page: pageParam, limit: limitParam } = await searchParams
  const rawLimit = parseInt(limitParam ?? String(DEFAULT_PAGE_SIZE), 10)
  const pageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE
  const currentPage = Math.max(parseInt(pageParam ?? '1', 10), 1)

  const { count: tankCount } = await supabase
    .from('tanks')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', brewery.id)

  const currentTankCount = tankCount || 0

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-border pb-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideWaves className="h-8 w-8 text-primary shadow-primary/20 shadow-2xl" />
              </div>
              Vessels
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground font-medium">Monitoring and allocation of fermentation infrastructure.</p>
              <TankLimitBadge currentCount={currentTankCount} />
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 self-start md:self-auto">
            <Link href="/tanks/print">
              <Button variant="outline" className="gap-2 font-bold border-primary/20 hover:bg-primary/10 text-primary">
                <LucidePrinter className="h-4 w-4" />
                Print QR Labels
              </Button>
            </Link>
          </div>
        </div>

        <RealtimeRefresh table="tanks" breweryId={brewery.id} />

        <Suspense fallback={<TanksSkeleton />}>
          <TanksContent breweryId={brewery.id} currentTankCount={currentTankCount} currentPage={currentPage} pageSize={pageSize} />
        </Suspense>

      </div>
    </div>
  )
}

async function TanksContent({
  breweryId,
  currentTankCount,
  currentPage,
  pageSize,
}: {
  breweryId: string
  currentTankCount: number
  currentPage: number
  pageSize: number
}) {
  const supabase = await createClient()
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const { data: tanks, count } = await supabase
    .from('tanks')
    .select('*', { count: 'exact' })
    .eq('brewery_id', breweryId)
    .order('name')
    .range(from, to)

  return (
    <div className="space-y-6">
      <TankAddGate currentCount={currentTankCount}>
        <TanksGrid tanks={tanks ?? []} />
      </TankAddGate>
      <TanksPaginationControls
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={count ?? 0}
      />
    </div>
  )
}

function TanksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-48 rounded-2xl bg-surface border border-border animate-pulse" />
      ))}
    </div>
  )
}
