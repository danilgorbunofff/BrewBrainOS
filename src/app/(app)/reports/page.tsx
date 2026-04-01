import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LucideFileBarChart, LucideArrowLeft, LucideShieldCheck,
  LucideCalendar, LucideBarChart3
} from 'lucide-react'
import { TTBReportTable } from '@/components/TTBReportTable'

export const metadata = {
  title: 'TTB Compliance Reports | BrewBrain OS',
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) redirect('/dashboard')

  // Fetch ALL batches for this brewery
  const { data: batches } = await supabase
    .from('batches')
    .select('id, recipe_name, status, og, fg, created_at')
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })

  // Fetch ALL tanks for capacity data
  const { data: tanks } = await supabase
    .from('tanks')
    .select('id, name, capacity')
    .eq('brewery_id', brewery.id)

  // Fetch ALL sanitation logs
  const { data: sanitationLogs } = await supabase
    .from('sanitation_logs')
    .select('id, tank_id, notes, cleaned_at, user_id')
    .order('cleaned_at', { ascending: false })

  // Fetch batch readings count
  const { count: totalReadings } = await supabase
    .from('batch_readings')
    .select('id', { count: 'exact', head: true })

  // --- Aggregate monthly production data ---
  const allBatches = batches || []
  const allTanks = tanks || []

  // Group batches by month
  const monthlyData: Record<string, {
    month: string
    monthKey: string
    totalBatches: number
    completedBatches: number
    activeBatches: number
    dumpedBatches: number
    estimatedBBL: number
    avgOG: number
    avgFG: number
    batches: typeof allBatches
  }> = {}

  // Default tank capacity: use average of all tanks or default 7 BBL
  const avgTankCapacity = allTanks.length > 0
    ? allTanks.reduce((sum, t) => sum + (Number(t.capacity) || 7), 0) / allTanks.length
    : 7

  for (const batch of allBatches) {
    const date = new Date(batch.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthLabel,
        monthKey,
        totalBatches: 0,
        completedBatches: 0,
        activeBatches: 0,
        dumpedBatches: 0,
        estimatedBBL: 0,
        avgOG: 0,
        avgFG: 0,
        batches: [],
      }
    }

    const m = monthlyData[monthKey]
    m.totalBatches++
    m.batches.push(batch)

    if (batch.status === 'complete' || batch.status === 'packaging') {
      m.completedBatches++
      m.estimatedBBL += avgTankCapacity // 1 batch ≈ 1 tank fill
    }
    if (batch.status === 'fermenting' || batch.status === 'conditioning') {
      m.activeBatches++
    }
    if (batch.status === 'dumped') {
      m.dumpedBatches++
    }
  }

  // Calculate averages
  for (const key of Object.keys(monthlyData)) {
    const m = monthlyData[key]
    const withOG = m.batches.filter(b => b.og)
    const withFG = m.batches.filter(b => b.fg)
    m.avgOG = withOG.length > 0 ? withOG.reduce((s, b) => s + Number(b.og), 0) / withOG.length : 0
    m.avgFG = withFG.length > 0 ? withFG.reduce((s, b) => s + Number(b.fg), 0) / withFG.length : 0
  }

  // Sort by month descending
  const monthlyReport = Object.values(monthlyData).sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  // Calculate grand totals
  const grandTotal = {
    totalBatches: allBatches.length,
    completedBatches: allBatches.filter(b => b.status === 'complete' || b.status === 'packaging').length,
    totalBBL: monthlyReport.reduce((s, m) => s + m.estimatedBBL, 0),
    totalGallons: monthlyReport.reduce((s, m) => s + m.estimatedBBL, 0) * 31, // 1 BBL = 31 Gallons
    sanitationCount: sanitationLogs?.length || 0,
    totalReadings: totalReadings || 0,
  }

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="border-b border-white/5 pb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideFileBarChart className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white">Compliance Reports</h1>
                <p className="text-zinc-500 font-medium mt-1">TTB Form 5130.9 monthly production &amp; FSMA sanitation logs.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <LucideShieldCheck className="h-3.5 w-3.5" />
                Audit Ready
              </div>
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Batches', value: grandTotal.totalBatches, accent: true },
            { label: 'Production (BBL)', value: grandTotal.totalBBL.toFixed(1), accent: true },
            { label: 'Production (Gal)', value: Math.round(grandTotal.totalGallons).toLocaleString(), accent: false },
            { label: 'Sanitation Logs', value: grandTotal.sanitationCount, accent: false },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">{kpi.label}</p>
              <p className={`text-3xl font-black tracking-tighter ${kpi.accent ? 'text-primary' : 'text-zinc-500'}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.02] p-5 flex items-start gap-4">
          <LucideCalendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-zinc-300">TTB Form 5130.9 — Brewer&apos;s Report of Operations</p>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Production is estimated as <span className="text-zinc-300 font-bold">1 batch = 1 tank fill</span> using 
              your average tank capacity of <span className="text-primary font-bold">{avgTankCapacity.toFixed(1)} BBL</span>.
              Formula: <span className="font-mono text-zinc-400">1 BBL = 31 US Gallons</span>.
              {brewery.license_number && (
                <span className="block mt-1">License: <span className="text-primary font-mono">{brewery.license_number}</span></span>
              )}
            </p>
          </div>
        </div>

        {/* Monthly Report Table — Client component for CSV export */}
        <TTBReportTable
          monthlyReport={monthlyReport.map(m => ({
            month: m.month,
            totalBatches: m.totalBatches,
            completedBatches: m.completedBatches,
            activeBatches: m.activeBatches,
            dumpedBatches: m.dumpedBatches,
            estimatedBBL: m.estimatedBBL,
            gallons: m.estimatedBBL * 31,
            avgOG: m.avgOG,
            avgFG: m.avgFG,
          }))}
          breweryName={brewery.name}
          licenseNumber={brewery.license_number}
        />

        {/* FSMA Sanitation Summary */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LucideShieldCheck className="h-4 w-4 text-green-400/60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">FSMA / HACCP Sanitation Log Summary</p>
            </div>
            <span className="text-[10px] font-bold text-zinc-700">{grandTotal.sanitationCount} total entries</span>
          </div>
          <div className="p-5">
            {sanitationLogs && sanitationLogs.length > 0 ? (
              <div className="space-y-2">
                {sanitationLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <LucideShieldCheck className="h-3.5 w-3.5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-300">
                          Tank cleaned
                          {log.notes && <span className="text-zinc-500 font-medium"> — {log.notes}</span>}
                        </p>
                        <p className="text-[10px] text-zinc-700 font-mono">Tank ID: {log.tank_id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-600 shrink-0">
                      {new Date(log.cleaned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
                {sanitationLogs.length > 10 && (
                  <p className="text-center text-xs text-zinc-700 font-medium pt-2">
                    Showing 10 of {sanitationLogs.length} entries. Export CSV for full log.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 font-medium text-center py-8">
                No sanitation records yet. Use the tank QR scan to log cleaning events.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
