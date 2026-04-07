import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  LucideClipboardList, LucidePackageSearch, LucideWaves,
  LucideAlertCircle, LucideArrowRight,
} from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VoiceLogger } from '@/components/VoiceLogger'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VoiceLoggerGate } from '@/components/VoiceLoggerGate'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import ReorderAlertsDashboard from '@/components/ReorderAlertsDashboard'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { setupBrewery } from './actions'
import { InitializeBreweryForm } from '@/components/InitializeBreweryForm'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getActiveBrewery } from '@/lib/active-brewery'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Dashboard — BrewBrain OS',
  description: 'Your brewery command center. Real-time production, tank status, and inventory alerts.',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const brewery = await getActiveBrewery()
  
  logger.info(`Dashboard accessed by user ${user.email}`, { breweryId: brewery?.id })

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <RealtimeRefresh table="batches" breweryId={brewery?.id || ''} />
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-8 duration-700">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
              Brewery <span className="text-primary italic">Brain</span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {brewery ? `Welcome back. ${brewery.name} is online.` : 'Initialize your facility to get started.'}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!brewery && (
          <div className="rounded-2xl border border-orange-600/20 bg-orange-600/[0.02] p-16 text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-4xl font-black text-foreground tracking-tighter italic">Initialize facility</h2>
              <p className="text-muted-foreground font-medium leading-relaxed">Establish your digital footprint. Define your brewery&apos;s identity to synchronize hardware and logs.</p>
              <InitializeBreweryForm />
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {brewery && (
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent breweryId={brewery.id} />
          </Suspense>
        )}

      </div>
    </div>
  )
}

async function DashboardContent({ breweryId }: { breweryId: string }) {
  const supabase = await createClient()

  const [batchRes, tankRes, inventoryRes] = await Promise.all([
    supabase.from('batches').select('id, recipe_name, status, created_at, og, fg')
      .eq('brewery_id', breweryId).order('created_at', { ascending: false }),
    supabase.from('tanks').select('id, name, status, current_batch_id')
      .eq('brewery_id', breweryId),
    supabase.from('inventory').select('id, name, current_stock, reorder_point, unit, item_type')
      .eq('brewery_id', breweryId),
  ])

  const batches = batchRes.data || []
  const tanks = tankRes.data || []
  const inventory = inventoryRes.data || []
  const batchIds = batches.map(b => b.id)

  // Only fetch readings for batches belonging to this brewery
  const readingsRes = batchIds.length > 0 
    ? await supabase.from('batch_readings').select('gravity, created_at')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: true })
        .limit(14)
    : { data: [] }

  const stats = {
    activeBatches: batches.filter(b => b.status === 'fermenting' || b.status === 'conditioning').length,
    fermenting: batches.filter(b => b.status === 'fermenting').length,
    conditioning: batches.filter(b => b.status === 'conditioning').length,
    totalTanks: tanks.length,
    tanksInUse: tanks.filter(t => t.current_batch_id || t.status === 'fermenting').length,
    lowStockItems: inventory.filter(i => i.current_stock <= (i.reorder_point || 0)).length,
  }

  const recentBatches = batches.slice(0, 4)
  const lowStockList = inventory.filter(i => i.current_stock <= (i.reorder_point || 0)).slice(0, 5)

  // Build gravity sparkline from readings
  const readings = readingsRes.data || []
  const gravityData = readings
    .filter(r => r.gravity != null)
    .map(r => Math.round((r.gravity - 1) * 1000)) // Convert 1.065 → 65

  const statusColor = (status: string) => {
    switch (status) {
      case 'fermenting': return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      case 'conditioning': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'packaging': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
      case 'complete': return 'text-green-400 bg-green-400/10 border-green-400/20'
      default: return 'text-muted-foreground bg-secondary border-border'
    }
  }

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <KPICard label="Active Batches" value={stats.activeBatches} accent />
        <KPICard label="Tanks in Use" value={`${stats.tanksInUse}/${stats.totalTanks}`} accent />
        <KPICard label="Fermenting" value={stats.fermenting} accent />
        <KPICard label="Low Stock" value={stats.lowStockItems} danger={stats.lowStockItems > 0} />
      </div>

      {/* Reorder Alerts */}
      <div className="animate-in fade-in slide-in-from-bottom-10 duration-800">
        <ReorderAlertsDashboard breweryId={breweryId} />
      </div>

      {/* Onboarding */}
      <OnboardingChecklist
        hasBrewery={true}
        hasTanks={stats.totalTanks > 0}
        hasBatches={stats.activeBatches > 0 || recentBatches.length > 0}
        hasInventory={stats.totalTanks > 0}
      />

      {/* Main Grid: Production Table + Gravity Chart */}
      <div className="grid md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        {/* Current Production */}
        <div className="md:col-span-3 rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Production</p>
            <Link href="/batches" className="text-[10px] text-muted-foreground font-bold hover:text-primary transition-colors flex items-center gap-1">
              View All <LucideArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-divider">
            {recentBatches.length > 0 ? recentBatches.map(batch => (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-surface-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground">{batch.id.slice(0, 6)}</span>
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{batch.recipe_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground">{batch.og?.toFixed(3) || '—'}</span>
                  <span className={cn(
                    'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                    statusColor(batch.status)
                  )}>
                    {batch.status}
                  </span>
                </div>
              </Link>
            )) : (
              <div className="px-5 py-12 text-center">
                <LucideClipboardList className="h-8 w-8 text-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No batches yet</p>
                <Link href="/batches" className="text-xs text-primary font-bold mt-1 inline-block">Create one →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Gravity Trend */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-surface p-5 flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
            Gravity Trend{recentBatches[0] ? ` — ${recentBatches[0].recipe_name}` : ''}
          </p>
          <div className="flex-1 flex items-end gap-[3px] min-h-[100px]">
            {gravityData.length >= 2 ? (
              gravityData.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/60 hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${Math.max((val / (gravityData[0] || 65)) * 100, 4)}%` }}
                  title={`1.${val.toString().padStart(3, '0')}`}
                />
              ))
            ) : (
              /* Show placeholder bars when no real data */
              [65, 58, 52, 44, 38, 33, 28, 24, 20, 18, 16, 14, 13, 12].map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-secondary"
                  style={{ height: `${val}%` }}
                />
              ))
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[9px] font-mono text-muted-foreground">Day 1</span>
            <span className="text-[9px] font-mono text-primary/70">
              {gravityData.length >= 2
                ? `1.${gravityData[gravityData.length - 1]?.toString().padStart(3, '0')} current`
                : 'No readings yet'
              }
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">Latest</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LucideAlertCircle className="h-3.5 w-3.5 text-red-400/60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Low Stock Alerts</p>
            </div>
            {lowStockList.length > 0 && (
              <Link href="/inventory" className="text-[10px] text-muted-foreground font-bold hover:text-primary transition-colors">
                Manage →
              </Link>
            )}
          </div>
          <div className="p-4">
            {lowStockList.length > 0 ? (
              <div className="space-y-2">
                {lowStockList.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10">
                    <div>
                      <p className="font-bold text-xs text-foreground">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase">{item.item_type}</p>
                    </div>
                    <span className="text-sm font-mono font-black text-red-400">
                      {item.current_stock} <span className="text-[9px] text-muted-foreground font-sans">{item.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-400/60 font-bold text-center py-6">All stock levels nominal ✓</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Actions</p>
          </div>
          <div className="p-3 space-y-1">
            {[
              { label: 'Vessels', href: '/tanks', icon: LucideWaves, desc: `${stats.totalTanks} registered` },
              { label: 'Batches', href: '/batches', icon: LucideClipboardList, desc: `${stats.activeBatches} active` },
              { label: 'Inventory', href: '/inventory', icon: LucidePackageSearch, desc: stats.lowStockItems > 0 ? `${stats.lowStockItems} alerts` : 'All clear' },
            ].map(action => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-all group">
                <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                </div>
                <LucideArrowRight className="h-3.5 w-3.5 text-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-surface border border-border" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-surface border border-border" />
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 h-64 rounded-2xl bg-surface border border-border" />
        <div className="md:col-span-2 h-64 rounded-2xl bg-surface border border-border" />
      </div>
    </div>
  )
}



function KPICard({ label, value, accent, danger }: { 
  label: string, value: string | number, accent?: boolean, danger?: boolean 
}) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border transition-all",
      danger ? "border-red-500/20 bg-red-500/[0.03]" : "border-border bg-surface"
    )}>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className={cn(
        "text-3xl font-black tracking-tighter",
        danger ? "text-red-400" : accent ? "text-primary" : "text-muted-foreground"
      )}>
        {value}
      </p>
    </div>
  )
}
