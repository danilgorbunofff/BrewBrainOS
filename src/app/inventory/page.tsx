import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addInventoryItem, adjustStock } from './actions'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { LucidePackageSearch, LucidePlus, LucideMinus, LucideAlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Inventory | BrewBrain OS',
}

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!brewery) {
     return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
           <div className="text-zinc-400 text-center space-y-4">
              <p>Configure your brewery first to access inventory.</p>
              <Link href="/dashboard"><Button>Go Setup Brewery</Button></Link>
           </div>
        </div>
     )
  }

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name', { ascending: true })

  const items = inventory || []
  
  const categories = ['All', 'Hops', 'Grain', 'Yeast', 'Adjunct']

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Header Segment */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
              <LucidePackageSearch className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-600 tracking-wider uppercase mb-1">Raw Materials</p>
              <h1 className="text-4xl font-extrabold tracking-tight">Inventory</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/dashboard"><Button variant="ghost" className="text-zinc-400">Back</Button></Link>
             <AddItemDialog />
          </div>
        </div>

        {/* Main Board */}
        <Tabs defaultValue="All" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 w-full justify-start h-12 overflow-x-auto rounded-xl">
             {categories.map(cat => (
               <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400 font-medium px-6">
                 {cat}
               </TabsTrigger>
             ))}
          </TabsList>
          
          {categories.map(category => {
            const filtered = category === 'All' 
              ? items 
              : items.filter(item => item.item_type === category)

            return (
              <TabsContent key={category} value={category} className="mt-6 border border-zinc-800 rounded-xl bg-zinc-950/50 backdrop-blur-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900 hover:bg-zinc-900 border-b border-zinc-800">
                    <TableRow className="hover:bg-transparent border-zinc-800">
                      <TableHead className="text-zinc-400 font-semibold pl-6 h-12">Item Name</TableHead>
                      <TableHead className="text-zinc-400 font-semibold">Category</TableHead>
                      <TableHead className="text-zinc-400 font-semibold">Stock Level</TableHead>
                      <TableHead className="text-right text-zinc-400 font-semibold pr-6">Quick Adjust</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? filtered.map((item) => {
                      const isLowStock = item.current_stock <= (item.reorder_point || 0)
                      return (
                        <TableRow key={item.id} className="border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors group">
                          <TableCell className="font-medium text-zinc-200 pl-6 py-4">
                            <div className="flex items-center gap-2">
                              {isLowStock && <span title="Low Stock!"><LucideAlertCircle className="h-4 w-4 text-orange-500" /></span>}
                              {item.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500">{item.item_type}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isLowStock ? 'bg-orange-950/30 border-orange-900/50 text-orange-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                              {item.current_stock} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <form action={adjustStock}>
                                 <input type="hidden" name="id" value={item.id} />
                                 <input type="hidden" name="adjustment" value="-1" />
                                 <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-orange-500 hover:bg-zinc-800 rounded-full">
                                    <LucideMinus className="h-4 w-4" />
                                 </Button>
                               </form>
                               <form action={adjustStock}>
                                 <input type="hidden" name="id" value={item.id} />
                                 <input type="hidden" name="adjustment" value="1" />
                                 <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-green-500 hover:bg-zinc-800 rounded-full">
                                    <LucidePlus className="h-4 w-4" />
                                 </Button>
                               </form>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-zinc-500 italic border-0">
                          No {category !== 'All' ? category.toLowerCase() : 'inventory'} items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}

function AddItemDialog() {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm h-10 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-600 disabled:pointer-events-none disabled:opacity-50">
        <LucidePlus className="h-4 w-4" />
        Add Item
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl">Add to Inventory</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Register a new raw material to your floor.
          </DialogDescription>
        </DialogHeader>
        <form action={addInventoryItem} className="space-y-6 pt-4">
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-400">Item Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Citra Hops T90" className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-600" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_type" className="text-zinc-400">Category</Label>
              <Select name="item_type" defaultValue="Hops">
                <SelectTrigger className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-600">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="Hops" className="focus:bg-zinc-800">Hops</SelectItem>
                  <SelectItem value="Grain" className="focus:bg-zinc-800">Grain</SelectItem>
                  <SelectItem value="Yeast" className="focus:bg-zinc-800">Yeast</SelectItem>
                  <SelectItem value="Adjunct" className="focus:bg-zinc-800">Adjunct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-zinc-400">Unit of Measurement</Label>
              <Select name="unit" defaultValue="kg">
                <SelectTrigger className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-600">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="kg" className="focus:bg-zinc-800">kg</SelectItem>
                  <SelectItem value="lbs" className="focus:bg-zinc-800">lbs</SelectItem>
                  <SelectItem value="oz" className="focus:bg-zinc-800">oz</SelectItem>
                  <SelectItem value="units" className="focus:bg-zinc-800">units</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="current_stock" className="text-zinc-400">Initial Stock</Label>
                <Input id="current_stock" name="current_stock" type="number" step="0.1" required defaultValue="0" min="0" className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-600" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="reorder_point" className="text-zinc-400">Reorder Alert At</Label>
                <Input id="reorder_point" name="reorder_point" type="number" step="0.1" required defaultValue="5" min="0" className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-600" />
             </div>
          </div>

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 font-bold rounded-xl mt-4">
            Save Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
