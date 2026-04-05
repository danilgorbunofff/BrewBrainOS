import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveBrewery } from '@/lib/active-brewery'
import { getInventoryTrends, getBatchPerformance } from '@/app/actions/analytics-actions'
import { InventoryTrendChart } from '@/components/analytics/InventoryTrendChart'
import { BatchPerformanceChart } from '@/components/analytics/BatchPerformanceChart'
import { LucideTrendingUp, LucideWallet, LucideActivity } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const brewery = await getActiveBrewery()
  if (!brewery) {
    redirect('/dashboard') // Cannot view analytics without initializing brewery
  }

  // Fetch chart data
  const inventoryTrends = await getInventoryTrends(90)
  const batchPerformance = await getBatchPerformance()

  // High level KPIs
  const totalWasted = inventoryTrends.reduce((sum, d) => sum + d.waste, 0)
  const totalUsed = inventoryTrends.reduce((sum, d) => sum + d.usage, 0)
  const shrinkPct = totalUsed > 0 ? ((totalWasted / totalUsed) * 100).toFixed(1) : 0

  const efficiencies = batchPerformance.filter(b => b.efficiency > 0).map(b => b.efficiency)
  const avgEfficiency = efficiencies.length > 0 
    ? (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(1) 
    : 0

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-8 duration-700">
          <div>
            <h1 className="text-3xl md:text-3xl font-black tracking-tighter flex items-center gap-2">
              <LucideTrendingUp className="h-7 w-7 text-primary" />
              Advanced Analytics
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Data-driven insights for {brewery.name}
            </p>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <AnalyticsKPICard 
            title="90-Day Shrinkage" 
            value={`${shrinkPct}%`} 
            subtitle={`${totalWasted} units classified as waste`}
            icon={LucideWallet}
            trend={parseFloat(shrinkPct as string) > 5 ? 'bad' : 'good'}
          />
          <AnalyticsKPICard 
            title="Avg Mash Efficiency" 
            value={`${avgEfficiency}%`} 
            subtitle="Actual OG vs Target OG"
            icon={LucideActivity}
            trend={parseFloat(avgEfficiency as string) >= 95 ? 'good' : 'neutral'}
          />
          <AnalyticsKPICard 
            title="Total Usage" 
            value={totalUsed.toFixed(0)} 
            subtitle="Units processed (90d)"
            icon={LucideTrendingUp}
            trend="neutral"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="h-[450px]">
            <InventoryTrendChart data={inventoryTrends} />
          </div>
          <div className="h-[450px]">
            <BatchPerformanceChart data={batchPerformance} />
          </div>
        </div>

      </div>
    </div>
  )
}

function AnalyticsKPICard({ 
  title, value, subtitle, icon: Icon, trend 
}: { 
  title: string, value: string | number, subtitle: string, icon: any, trend: 'good' | 'bad' | 'neutral' 
}) {
  return (
    <div className={cn(
      "rounded-2xl p-5 border bg-surface flex flex-col gap-3",
      trend === 'bad' ? "border-red-500/20" : trend === 'good' ? "border-green-500/20" : "border-border"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          trend === 'bad' ? "bg-red-500/10 text-red-500" : trend === 'good' ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-4xl font-black tracking-tighter text-foreground mb-1">
          {value}
        </p>
        <p className="text-xs text-muted-foreground font-medium">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
