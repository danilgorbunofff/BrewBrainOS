import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog'
import { InventoryTable } from '@/components/InventoryTable'
import { BluetoothScalePanel } from '@/components/BluetoothScalePanel'
import { LucidePackageSearch, LucideAlertCircle } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()

  if (!brewery) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4">
        <div className="text-zinc-500 text-center space-y-6 max-w-sm glass p-12 rounded-[3rem] border-white/5">
          <LucideAlertCircle className="size-12 text-primary mx-auto opacity-50" />
          <p className="font-medium">Standardize your production floor footprint before managing raw materials.</p>
          <Link href="/dashboard" className="block">
            <Button className="w-full">Initialize Brewery Office</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-4 md:p-8 pt-6 md:pt-8 pb-24 md:pb-8 selection:bg-primary/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 border-b border-white/5 pb-6 md:pb-10">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="p-3 md:p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-2xl">
              <LucidePackageSearch className="h-6 w-6 md:h-8 md:w-8 text-primary shadow-primary/20 shadow-2x" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white">Inventory</h1>
              <p className="text-zinc-500 mt-1 font-medium italic text-sm md:text-base">Resource allocation and stock management console.</p>
            </div>
          </div>
          <AddInventoryItemDialog />
        </div>

        {/* Bluetooth Scale Integration */}
        <BluetoothScalePanel items={inventory || []} />

        <InventoryTable items={inventory || []} />

      </div>
    </div>
  )
}

