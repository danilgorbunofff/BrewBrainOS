import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addTank } from './actions'
import { LucideWaves, LucidePlus } from 'lucide-react'

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
    redirect('/dashboard') // Need brewery first
  }

  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <LucideWaves className="h-10 w-10 text-orange-600" />
              Tanks
            </h1>
            <p className="text-zinc-500 mt-2">Manage all fermentation and conditioning vessels.</p>
          </div>
          
          <form action={addTank} className="flex flex-row items-center gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <Input name="name" placeholder="Tank Name (e.g. FV-1)" required className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-600 w-40" />
            <Input name="capacity" type="number" placeholder="Cap (BBL)" className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-600 w-24" />
            <Button type="submit" size="icon" className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
              <LucidePlus className="h-5 w-5" />
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tanks?.map(tank => (
            <Link href={`/tank/${tank.id}`} key={tank.id}>
              <Card className="group h-full bg-zinc-900/40 border-zinc-800 hover:border-orange-600/30 hover:bg-zinc-900/60 transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-orange-500 flex items-center justify-between">
                    {tank.name}
                    {tank.status === 'fermenting' && <span className="flex h-3 w-3 rounded-full bg-orange-500 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse" />}
                    {tank.status !== 'fermenting' && <span className="flex h-3 w-3 rounded-full bg-zinc-600 shrink-0" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-500 text-sm mb-2 capitalize">{tank.status?.replace('-', ' ')}</p>
                  <div className="flex justify-between items-center text-xs font-semibold">
                     <span className="text-zinc-400">Vol: {tank.capacity || '?'} BBL</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {(!tanks || tanks.length === 0) && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <LucideWaves className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-400 mb-1">No Tanks Configured</h3>
              <p className="text-zinc-600">Use the form above to add your first fermenter or brite tank.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
