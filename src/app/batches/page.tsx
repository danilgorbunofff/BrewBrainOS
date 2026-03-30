import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addBatch } from './actions'
import { LucideClipboardList, LucidePlus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = {
  title: 'Batches | BrewBrain OS',
}

export default async function BatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) redirect('/dashboard')

  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <LucideClipboardList className="h-10 w-10 text-orange-600" />
              Batches
            </h1>
            <p className="text-zinc-500 mt-2">Log and monitor active fermentation cycles.</p>
          </div>
          
          <form action={addBatch} className="flex flex-row items-center gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <Input name="recipeName" placeholder="Recipe (e.g. IPA)" required className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-600 w-40" />
            <Input name="og" type="number" step="0.001" placeholder="OG" className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-600 w-24" />
            <Button type="submit" size="icon" className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
              <LucidePlus className="h-5 w-5" />
            </Button>
          </form>
        </div>

        <Card className="bg-zinc-900/40 border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Recipe</TableHead>
                <TableHead className="text-zinc-400">Created</TableHead>
                <TableHead className="text-zinc-400">OG</TableHead>
                <TableHead className="text-zinc-400">Current FG</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches?.map(batch => (
                <TableRow key={batch.id} className="border-zinc-800/50 hover:bg-zinc-800/20">
                  <TableCell className="font-medium text-zinc-100">{batch.recipe_name}</TableCell>
                  <TableCell className="text-zinc-400">{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-zinc-300">{batch.og?.toFixed(3) || '--'}</TableCell>
                  <TableCell className="text-orange-400 font-mono font-bold">{batch.fg?.toFixed(3) || '--'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${batch.status === 'fermenting' ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-400'}`}>
                      {batch.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!batches || batches.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                    No batches have been initiated yet. Use the tool above to start your first brew!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

      </div>
    </div>
  )
}
