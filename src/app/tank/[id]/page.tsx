import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideWaves, LucideHistory, LucideCheckCircle, LucideAlertTriangle } from 'lucide-react'
import { logSanitation } from './actions'

export const metadata = {
  title: 'Tank Dashboard | BrewBrain OS',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TankPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Verify UUID format safely
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  if (!uuidRegex.test(id)) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
               <Card className="max-w-md bg-zinc-900 border-zinc-800 p-8 text-center text-zinc-100">
                    <LucideAlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Invalid Tank Scan</h2>
                    <p className="text-zinc-400 mb-6">The scanned QR code is corrupt or unrecognized.</p>
                    <Link href="/scan"><Button className="bg-orange-600 hover:bg-orange-700">Scan Again</Button></Link>
               </Card>
          </div>
      )
  }

  const { data: tank, error: tankError } = await supabase
    .from('tanks')
    .select(`
      *,
      batches (
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
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <Card className="max-w-md bg-zinc-900 border-zinc-800 p-8 text-center text-zinc-100">
                <LucideAlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Tank Not Found</h2>
                <p className="text-zinc-400 mb-6">This tank does not exist in your brewery's database.</p>
                <Link href="/scan"><Button className="bg-orange-600 hover:bg-orange-700">Scan Again</Button></Link>
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
              <LucideWaves className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-600 tracking-wider uppercase mb-1">Tank Status</p>
              <h1 className="text-4xl font-extrabold tracking-tight">{tank.name}</h1>
            </div>
          </div>
          <Link href="/scan">
            <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-zinc-100 hidden md:flex">
              Scan Another Tank
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Active Batch Info */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.6)] animate-pulse" />
                Current Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tank.current_batch_id && tank.batches ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-500">Recipe</p>
                    <p className="text-lg font-bold text-zinc-200">{(tank.batches as any).recipe_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-sm text-zinc-500">Status</p>
                        <p className="font-semibold text-orange-500">{(tank.batches as any).status}</p>
                     </div>
                     <div>
                        <p className="text-sm text-zinc-500">Capacity</p>
                        <p className="font-semibold text-zinc-300">{tank.capacity_bbl} BBL</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                     <div>
                        <p className="text-sm text-zinc-500">OG (Original)</p>
                        <p className="font-mono text-zinc-300">{(tank.batches as any).og || '--'}</p>
                     </div>
                     <div>
                        <p className="text-sm text-zinc-500">FG (Current)</p>
                        <p className="font-mono text-zinc-300">{(tank.batches as any).fg || '--'}</p>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  Tank is currently empty & available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sanitation Logs */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <LucideHistory className="h-5 w-5 text-zinc-500" />
                Sanitation Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-3">
                {logs && logs.length > 0 ? logs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm p-3 rounded-md bg-zinc-950/50 border border-zinc-800">
                    <LucideCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-grow text-zinc-400">
                        {log.notes}
                    </div>
                    <div className="text-zinc-600 font-mono text-xs text-right shrink-0">
                        {new Date(log.cleaned_at).toLocaleDateString()}
                    </div>
                  </div>
                )) : (
                   <p className="text-sm text-zinc-500">No recent cleaning records.</p>
                )}
              </div>

              {/* Server Action Form */}
              <form action={logSanitation} className="pt-4 border-t border-zinc-800">
                <input type="hidden" name="tankId" value={tank.id} />
                <Button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white gap-2 font-semibold">
                  <LucideCheckCircle className="h-4 w-4 text-orange-500" />
                  Mark Cleaned (FSMA)
                </Button>
              </form>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
