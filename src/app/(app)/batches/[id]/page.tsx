import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LucideClipboardList, LucideArrowLeft, LucideThermometer,
  LucideActivity, LucideCheckCircle2, LucideFlaskConical, LucideAlertCircle
} from 'lucide-react'
import { updateBatchStatus, updateBatchFG } from './actions'
import { deleteBatch } from '../actions'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { GravityChart } from '@/components/GravityChart'
import { cn } from '@/lib/utils'
import { getActiveBrewery } from '@/lib/active-brewery'

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

  const currentStatus = BATCH_STATUSES.find(s => s.value === batch.status)
  const abv = batch.og && batch.fg
    ? (((batch.og - batch.fg) * 131.25)).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-10">
          <div className="space-y-2">
            <Link href="/batches" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors mb-4">
              <LucideArrowLeft className="h-3.5 w-3.5" />
              Back to Batches
            </Link>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideClipboardList className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white">{batch.recipe_name}</h1>
                <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1">ID: {batch.id.slice(0, 8)}…</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border',
              currentStatus?.color || 'text-zinc-500 bg-white/5 border-white/10'
            )}>
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {batch.status}
            </span>
            <DeleteConfirmButton
              action={deleteBatch}
              hiddenInputs={{ batchId: batch.id }}
              itemName={batch.recipe_name}
              redirectOnSuccess="/batches"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Original Gravity', value: batch.og?.toFixed(3) || '--', icon: LucideFlaskConical },
            { label: 'Final Gravity', value: batch.fg?.toFixed(3) || '--', icon: LucideActivity },
            { label: 'Est. ABV', value: abv ? `${abv}%` : '--', icon: LucideThermometer },
            { label: 'Initiated', value: new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), icon: LucideCheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass border-white/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
                </div>
                <p className="font-mono font-black text-2xl text-white tracking-tighter">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gravity / Temperature Chart */}
        <Card className="glass border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <LucideActivity className="h-4 w-4 text-primary/60" />
              Fermentation Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GravityChart readings={readings || []} />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Update Status */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {BATCH_STATUSES.map((s) => (
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
                        : 'text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300'
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

          {/* Update FG */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight">Log Final Gravity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500 font-medium">Manually set the current final gravity reading for this batch.</p>
              <form action={updateBatchFG as any} className="flex gap-2">
                <input type="hidden" name="batchId" value={batch.id} />
                <Input
                  key={`fg-${id}-${batch.fg}`}
                  name="fg"
                  type="number"
                  step="0.001"
                  min="0.990"
                  max="1.200"
                  defaultValue={batch.fg?.toFixed(3) || ''}
                  placeholder="e.g. 1.012"
                  className="font-mono w-full"
                  required
                />
                <Button type="submit" className="shrink-0">
                  Commit
                </Button>
              </form>
              {batch.og && batch.fg && (
                <p className="text-xs text-zinc-600 font-mono">
                  Attenuation: {(((batch.og - batch.fg) / (batch.og - 1)) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Readings Log */}
        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <LucideActivity className="h-5 w-5 text-primary/60" />
              Production Readings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {readings && readings.length > 0 ? (
              <div className="divide-y divide-white/5">
                {readings.map((reading) => (
                  <div key={reading.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <LucideThermometer className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-300">
                          {reading.temperature ? `${reading.temperature}° ` : ''}
                          {reading.gravity ? `Gravity ${reading.gravity}` : ''}
                          {!reading.temperature && !reading.gravity ? '— No metrics extracted' : ''}
                        </p>
                        {reading.notes && reading.notes !== 'No notes.' && (
                          <p className="text-xs text-zinc-600 font-medium mt-0.5">{reading.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 ml-4">
                      {new Date(reading.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(reading.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <LucideAlertCircle className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-500">No readings yet</p>
                <p className="text-xs text-zinc-700 font-medium mt-1">Use the voice logger on a tank page to add readings.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
