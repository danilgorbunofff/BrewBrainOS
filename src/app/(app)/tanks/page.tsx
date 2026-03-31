import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { deleteTank } from './actions'
import { AddTankForm } from '@/components/AddTankForm'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { LucideWaves } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Tanks | BrewBrain OS',
}

export default async function TanksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) {
    redirect('/dashboard')
  }

  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name')

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideWaves className="h-8 w-8 text-primary shadow-primary/20 shadow-2xl" />
              </div>
              Vessels
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">Monitoring and allocation of fermentation infrastructure.</p>
          </div>
          
          <AddTankForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tanks?.map(tank => (
            <Link href={`/tank/${tank.id}`} key={tank.id} className="block group">
              <Card className="h-full relative border-white/5 overflow-hidden">
                {tank.status === 'fermenting' && (
                  <div className="absolute top-0 right-0 p-4">
                    <span className="flex h-3 w-3 rounded-full bg-primary shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse" />
                  </div>
                )}
                <div className="absolute top-4 right-4 z-10" onClick={(e) => e.preventDefault()}>
                  <DeleteConfirmButton
                    action={deleteTank}
                    hiddenInputs={{ tankId: tank.id }}
                    itemName={tank.name}
                  />
                </div>
                <CardHeader className="pb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
                    {tank.status === 'fermenting' ? 'Active Cycle' : 'Ready'}
                  </span>
                  <CardTitle className="text-4xl tracking-tighter group-hover:text-primary transition-colors">
                    {tank.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        tank.status === 'fermenting' ? "bg-primary w-[65%]" : "bg-zinc-700 w-0"
                      )} 
                    />
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-zinc-400 capitalize">{tank.status?.replace('-', ' ')}</span>
                     <span className="text-xs font-mono font-black text-zinc-600">{tank.capacity || '??'} BBL</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {(!tanks || tanks.length === 0) && (
            <div className="col-span-full py-24 text-center glass rounded-[3rem] border-white/5">
              <div className="bg-zinc-900/50 h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                <LucideWaves className="h-10 w-10 text-zinc-700" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">No Vessels Initialized</h3>
              <p className="text-zinc-500 font-medium max-w-xs mx-auto">Standardize your production floor by registering your fermenters and brite tanks.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
