import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  LucideWaves, LucideHistory, LucideCheckCircle, LucideAlertTriangle,
  LucideMic, LucideLink, LucideUnlink, LucideArrowLeft
} from 'lucide-react'
import { logSanitation, assignBatch, unassignBatch } from './actions'
import { VoiceLogger } from '@/components/VoiceLogger'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Tank Dashboard | BrewBrain OS',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TankPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify UUID format safely
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  if (!uuidRegex.test(id)) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4">
        <Card className="max-w-md glass border-white/5 p-8 text-center text-zinc-100">
          <LucideAlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Tank Scan</h2>
          <p className="text-zinc-400 mb-6">The scanned QR code is corrupt or unrecognized.</p>
          <Link href="/scan"><Button>Scan Again</Button></Link>
        </Card>
      </div>
    )
  }

  const { data: tank, error: tankError } = await supabase
    .from('tanks')
    .select(`
      *,
      batches (
        id,
        recipe_name,
        status,
        og,
        fg
      )
    `)
    .eq('id', id)
    .single()

  if (tankError || !tank) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4">
        <Card className="max-w-md glass border-white/5 p-8 text-center text-zinc-100">
          <LucideAlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tank Not Found</h2>
          <p className="text-zinc-400 mb-6">This tank does not exist in your brewery's database.</p>
          <Link href="/tanks"><Button>Back to Vessels</Button></Link>
        </Card>
      </div>
    )
  }

  const { data: logs } = await supabase
    .from('sanitation_logs')
    .select('*')
    .eq('tank_id', id)
    .order('cleaned_at', { ascending: false })
    .limit(5)

  // Fetch all brewery's batches for the assignment dropdown
  const { data: allBatches } = await supabase
    .from('batches')
    .select('id, recipe_name, status')
    .eq('brewery_id', tank.brewery_id)
    .in('status', ['fermenting', 'conditioning'])
    .order('created_at', { ascending: false })

  const activeBatch = tank.current_batch_id ? (tank.batches as any) : null

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-white/5 pb-10">
          <div>
            <Link href="/tanks" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors mb-4">
              <LucideArrowLeft className="h-3.5 w-3.5" />
              Back to Vessels
            </Link>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
                <LucideWaves className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Tank Status</p>
                <h1 className="text-4xl font-black tracking-tighter">{tank.name}</h1>
                <p className="text-zinc-600 font-mono text-sm mt-0.5">{tank.capacity || '??'} BBL capacity</p>
              </div>
            </div>
          </div>

          <div className={cn(
            'px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border self-start md:self-auto',
            tank.status === 'fermenting'
              ? 'text-primary bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
              : 'text-zinc-500 bg-white/5 border-white/10'
          )}>
            {tank.status === 'fermenting' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse mr-2" />}
            {tank.status?.replace('-', ' ')}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Active Batch Info */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  activeBatch ? 'bg-primary animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-zinc-700'
                )} />
                Current Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBatch ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Recipe</p>
                      <p className="text-xl font-black text-white tracking-tight">{activeBatch.recipe_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Status</p>
                        <p className="font-bold text-primary text-sm capitalize">{activeBatch.status}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Capacity</p>
                        <p className="font-mono font-bold text-zinc-300 text-sm">{tank.capacity || '??'} BBL</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">OG</p>
                        <p className="font-mono font-bold text-zinc-300 text-sm">{activeBatch.og || '--'}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Current FG</p>
                        <p className="font-mono font-black text-primary text-sm">{activeBatch.fg || '--'}</p>
                      </div>
                    </div>
                    <Link href={`/batches/${activeBatch.id}`} className="block w-full">
                      <Button variant="outline" className="w-full rounded-xl border-white/10 text-zinc-400 hover:text-primary hover:border-primary/30">
                        View Full Batch Log →
                      </Button>
                    </Link>
                  </div>

                  {/* Unassign */}
                  <form action={unassignBatch}>
                    <input type="hidden" name="tankId" value={tank.id} />
                    <Button type="submit" variant="ghost" className="w-full text-zinc-700 hover:text-red-500 hover:bg-red-500/5 rounded-xl gap-2 border border-transparent hover:border-red-500/20">
                      <LucideUnlink className="h-4 w-4" />
                      Clear Tank Assignment
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl">
                    <p className="text-zinc-600 font-medium text-sm">Tank is empty & available</p>
                  </div>
                  {allBatches && allBatches.length > 0 ? (
                    <form action={assignBatch} className="space-y-2">
                      <input type="hidden" name="tankId" value={tank.id} />
                      <select
                        name="batchId"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="" disabled>Select batch to assign…</option>
                        {allBatches.map(b => (
                          <option key={b.id} value={b.id} className="bg-zinc-900">
                            {b.recipe_name} ({b.status})
                          </option>
                        ))}
                      </select>
                      <Button type="submit" className="w-full rounded-xl gap-2">
                        <LucideLink className="h-4 w-4" />
                        Assign Batch to Tank
                      </Button>
                    </form>
                  ) : (
                    <p className="text-center text-xs text-zinc-700 font-medium">
                      No active batches to assign.{' '}
                      <Link href="/batches" className="text-primary hover:underline">Create one →</Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sanitation Logs */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <LucideHistory className="h-5 w-5 text-zinc-500" />
                Sanitation Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                {logs && logs.length > 0 ? logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <LucideCheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-grow min-w-0">
                      <p className="text-zinc-400 text-sm truncate">{log.notes}</p>
                      <p className="text-zinc-700 font-mono text-xs mt-0.5">
                        {new Date(log.cleaned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-zinc-600 font-medium text-center py-4">No cleaning records on file.</p>
                )}
              </div>

              {/* Fixed: Sanitation form now includes a notes text field */}
              <form action={logSanitation} className="pt-2 border-t border-white/5 space-y-2">
                <input type="hidden" name="tankId" value={tank.id} />
                <Input
                  name="notes"
                  placeholder="Cleaning notes (optional)"
                  className="bg-white/5 border-white/10 text-sm"
                />
                <Button type="submit" className="w-full gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10">
                  <LucideCheckCircle className="h-4 w-4 text-primary" />
                  Mark Cleaned (FSMA)
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>

        {/* Tank Voice Logger */}
        <Card className="glass border-white/5 p-8 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="flex items-center gap-2 mb-2">
            <LucideMic className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-black tracking-tight text-white">Log Reading</h2>
          </div>
          <p className="text-zinc-500 text-sm max-w-sm mb-6 font-medium">
            Hold the button to record a temperature or gravity log for{' '}
            <span className="text-zinc-300 font-bold">{tank.name}</span>.
            {!activeBatch && (
              <span className="block mt-1 text-primary/80 text-xs">
                ⚠ Assign a batch to this tank first — readings need a batch to link to.
              </span>
            )}
          </p>
          <VoiceLogger tankId={tank.id} />
        </Card>

      </div>
    </div>
  )
}
