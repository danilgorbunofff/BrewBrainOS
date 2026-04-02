import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  LucideClipboardList, LucidePackageSearch, LucideWaves,
  LucideAlertCircle, LucideArrowRight,
} from 'lucide-react'
import { VoiceLogger } from '@/components/VoiceLogger'
import { VoiceLoggerGate } from '@/components/VoiceLoggerGate'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import { setupBrewery } from './actions'
import { InitializeBreweryForm } from '@/components/InitializeBreweryForm'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getActiveBrewery } from '@/lib/active-brewery'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const brewery = await getActiveBrewery()

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-8 duration-700">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
              Brewery <span className="text-primary italic">Brain</span>
            </h1>
            <p className="text-xs text-zinc-600 font-medium mt-1">
              {brewery ? `Welcome back. ${brewery.name} is online.` : 'Initialize your facility to get started.'}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!brewery && (
          <div className="rounded-2xl border border-orange-600/20 bg-orange-600/[0.02] p-16 text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-4xl font-black text-white tracking-tighter italic">Initialize facility</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">Establish your digital footprint. Define your brewery&apos;s identity to synchronize hardware and logs.</p>
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

  const [batchRes, tankRes, inventoryRes, readingsRes] = await Promise.all([
    supabase.from('batches').select('id, recipe_name, status, created_at, og, fg')
      .eq('brewery_id', breweryId).order('created_at', { ascending: false }),
    supabase.from('tanks').select('id, name, status, current_batch_id')
      .eq('brewery_id', breweryId),
    supabase.from('inventory').select('id, name, current_stock, reorder_point, unit, item_type')
      .eq('brewery_id', breweryId),
    supabase.from('batch_readings').select('gravity, created_at')
      .order('created_at', { ascending: true })
      .limit(14),
  ])

  const batches = batchRes.data || []
  const tanks = tankRes.data || []
  const inventory = inventoryRes.data || []

  const stats = {
    activeBatches: batches.filter(b => b.status === 'fermenting' || b.status === 'conditioning').length,
    fermenting: batches.filter(b => b.status === 'fermenting').length,
    conditioning: batches.filter(b => b.status === 'conditioning').length,
    totalTanks: tanks.length,
    tanksInUse: tanks.filter(t => t.current_batch_id).length,
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
      default: return 'text-zinc-500 bg-white/5 border-white/5'
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
        <div className="md:col-span-3 rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Production</p>
            <Link href="/batches" className="text-[10px] text-zinc-700 font-bold hover:text-primary transition-colors flex items-center gap-1">
              View All <LucideArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentBatches.length > 0 ? recentBatches.map(batch => (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-700">{batch.id.slice(0, 6)}</span>
                  <span className="text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">{batch.recipe_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-600">{batch.og?.toFixed(3) || '—'}</span>
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
                <LucideClipboardList className="h-8 w-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-sm text-zinc-700 font-medium">No batches yet</p>
                <Link href="/batches" className="text-xs text-primary font-bold mt-1 inline-block">Create one →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Gravity Trend */}
        <div className="md:col-span-2 rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
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
                  className="flex-1 rounded-t-sm bg-white/5"
                  style={{ height: `${val}%` }}
                />
              ))
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[9px] font-mono text-zinc-700">Day 1</span>
            <span className="text-[9px] font-mono text-primary/70">
              {gravityData.length >= 2
                ? `1.${gravityData[gravityData.length - 1]?.toString().padStart(3, '0')} current`
                : 'No readings yet'
              }
            </span>
            <span className="text-[9px] font-mono text-zinc-700">Latest</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LucideAlertCircle className="h-3.5 w-3.5 text-red-400/60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Low Stock Alerts</p>
            </div>
            {lowStockList.length > 0 && (
              <Link href="/inventory" className="text-[10px] text-zinc-700 font-bold hover:text-primary transition-colors">
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
                      <p className="font-bold text-xs text-zinc-300">{item.name}</p>
                      <p className="text-[9px] text-zinc-600 font-black uppercase">{item.item_type}</p>
                    </div>
                    <span className="text-sm font-mono font-black text-red-400">
                      {item.current_stock} <span className="text-[9px] text-zinc-600 font-sans">{item.unit}</span>
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
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quick Actions</p>
          </div>
          <div className="p-3 space-y-1">
            {[
              { label: 'Vessels', href: '/tanks', icon: LucideWaves, desc: `${stats.totalTanks} registered` },
              { label: 'Batches', href: '/batches', icon: LucideClipboardList, desc: `${stats.activeBatches} active` },
              { label: 'Inventory', href: '/inventory', icon: LucidePackageSearch, desc: stats.lowStockItems > 0 ? `${stats.lowStockItems} alerts` : 'All clear' },
            ].map(action => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group">
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                  <action.icon className="h-3.5 w-3.5 text-zinc-600 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{action.label}</p>
                  <p className="text-[10px] text-zinc-700">{action.desc}</p>
                </div>
                <LucideArrowRight className="h-3.5 w-3.5 text-zinc-800 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Logger — hidden on mobile, available via floating button instead */}
      <div className="hidden md:block relative group rounded-2xl p-1 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)] animate-in fade-in duration-1000">
        <VoiceLoggerGate />
      </div>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/5" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-white/[0.02] border border-white/5" />
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 h-64 rounded-2xl bg-white/[0.02] border border-white/5" />
        <div className="md:col-span-2 h-64 rounded-2xl bg-white/[0.02] border border-white/5" />
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
      danger ? "border-red-500/20 bg-red-500/[0.03]" : "border-white/5 bg-white/[0.02]"
    )}>
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">{label}</p>
      <p className={cn(
        "text-3xl font-black tracking-tighter",
        danger ? "text-red-400" : accent ? "text-primary" : "text-zinc-500"
      )}>
        {value}
      </p>
    </div>
  )
}
