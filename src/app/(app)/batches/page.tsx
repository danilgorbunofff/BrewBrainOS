import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { BatchesTable } from '@/components/BatchesTable'
import { AddBatchForm } from '@/components/AddBatchForm'
import { LucideClipboardList } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'

export const metadata = {
  title: 'Batches | BrewBrain OS',
}

export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function BatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()

  if (!brewery) redirect('/dashboard')

  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-4 md:p-8 pt-6 md:pt-8 pb-24 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 border-b border-white/5 pb-6 md:pb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideClipboardList className="h-6 w-6 md:h-8 md:w-8 text-primary shadow-primary/20 shadow-2xl" />
              </div>
              Batches
            </h1>
            <p className="text-zinc-500 mt-1.5 md:mt-2 font-medium text-sm md:text-base">Production cycle monitoring and analytics.</p>
          </div>
          
          <AddBatchForm />
        </div>

        <BatchesTable batches={batches || []} />

      </div>
    </div>
  )
}
