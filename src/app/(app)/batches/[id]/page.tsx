import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LucideClipboardList, LucideArrowLeft, LucideThermometer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LucideActivity, LucideCheckCircle2, LucideFlaskConical, LucideAlertCircle, LucideTrash2
} from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateBatchStatus, updateBatchFG } from './actions'
import { deleteBatch } from '../actions'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { GravityChart } from '@/components/GravityChart'
import { cn } from '@/lib/utils'
import { getActiveBrewery } from '@/lib/active-brewery'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import { FermentationAlertsPanel } from '@/components/FermentationAlertsPanel'
import { ManualReadingForm } from '@/components/ManualReadingForm'
import { YeastViabilityCard } from '@/components/YeastViabilityCard'
import { BatchReadingsTable } from '@/components/BatchReadingsTable'
import { BrewingMetricsForm } from '@/components/BrewingMetricsForm'

interface PageProps {
  params: Promise<{ id: string }>
}

const BATCH_STATUSES = [
  { value: 'fermenting', label: 'Fermenting', color: 'text-primary bg-primary/10 border-primary/20' },
  { value: 'conditioning', label: 'Conditioning', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'packaging', label: 'Packaging', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { value: 'complete', label: 'Complete', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  { value: 'dumped', label: 'Dumped', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
]

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()

  if (!brewery) redirect('/dashboard')

  const { data: batch, error } = await supabase
    .from('batches')
    .select('*')
    .eq('id', id)
    .eq('brewery_id', brewery.id)
    .single()

  if (error || !batch) notFound()

  const { data: readings } = await supabase
    .from('batch_readings')
    .select('*')
    .eq('batch_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: alerts } = await supabase
    .from('fermentation_alerts')
    .select('*')
    .eq('batch_id', id)
    .order('created_at', { ascending: false })

  const { data: yeastLogs } = await supabase
    .from('yeast_logs')
    .select('*')
    .eq('batch_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const currentStatus = BATCH_STATUSES.find(s => s.value === batch.status)
  const abv = batch.og && batch.fg
    ? (((batch.og - batch.fg) * 131.25)).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 selection:bg-primary/30">
      <RealtimeRefresh table="batch_readings" breweryId={brewery.id} />
      <RealtimeRefresh table="fermentation_alerts" breweryId={brewery.id} />
      <RealtimeRefresh table="yeast_logs" breweryId={brewery.id} />

      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-10">
          <div className="space-y-2">
            <Link href="/batches" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
              <LucideArrowLeft className="h-3.5 w-3.5" />
              Back to Batches
            </Link>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideClipboardList className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-foreground">{batch.recipe_name}</h1>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">ID: {batch.id.slice(0, 8)}…</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border',
              currentStatus?.color || 'text-muted-foreground bg-secondary border-border'
            )}>
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {batch.status}
            </span>
            <DeleteConfirmDialog
              action={deleteBatch}
              hiddenInputs={{ batchId: batch.id, redirectTo: '/batches' }}
              itemName={batch.recipe_name}
              redirectOnSuccess="/batches"
              trigger={
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold"
                >
                  <LucideTrash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Batch
                </Button>
              }
            />
          </div>
        </div>

        {/* Alerts Panel */}
        <FermentationAlertsPanel alerts={alerts || []} batchId={batch.id} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Original Gravity', value: batch.og?.toFixed(3) || '--', icon: LucideFlaskConical },
            { label: 'Final Gravity', value: batch.fg?.toFixed(3) || '--', icon: LucideActivity },
            { label: 'Est. ABV', value: abv ? `${abv}%` : '--', icon: LucideThermometer },
            { label: 'Initiated', value: new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), icon: LucideCheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                </div>
                <p className="font-mono font-black text-2xl text-foreground tracking-tighter">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gravity / Temperature Chart */}
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <LucideActivity className="h-4 w-4 text-primary/60" />
              Fermentation Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GravityChart 
              readings={readings || []} 
              targetProfile={batch.og && batch.fg ? { og: batch.og, fg: batch.fg, expectedDays: 14 } : undefined} 
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Update Status */}
          <Card className="glass border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {BATCH_STATUSES.map((s) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <form key={s.value} action={updateBatchStatus as any}>
                  <input type="hidden" name="batchId" value={batch.id} />
                  <input type="hidden" name="status" value={s.value} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className={cn(
                      'w-full justify-start font-bold text-sm rounded-xl border transition-all duration-200',
                      batch.status === s.value
                        ? s.color + ' border-current'
                        : 'text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full mr-2 bg-current', batch.status === s.value ? 'animate-pulse' : 'opacity-30')} />
                    {s.label}
                    {batch.status === s.value && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-70">Active</span>}
                  </Button>
                </form>
              ))}
            </CardContent>
          </Card>

          {/* Manual Input (Multi-Sensor) and Metrics */}
          <div className="space-y-6">
            <ManualReadingForm batchId={batch.id} />
            <BrewingMetricsForm batchId={batch.id} />
          </div>
        </div>

        {/* Yeast Viability */}
        <YeastViabilityCard batchId={batch.id} yeastLogs={yeastLogs || []} />

        {/* Readings Log Table */}
        <Card className="glass border-border overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <LucideActivity className="h-5 w-5 text-primary/60" />
              Production Readings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BatchReadingsTable readings={readings || []} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
