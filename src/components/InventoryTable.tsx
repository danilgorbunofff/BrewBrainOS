'use client'

import { SearchFilter } from '@/components/SearchFilter'
import { ExportCSVButton } from '@/components/ExportCSVButton'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideMinus, LucidePlus, LucideAlertCircle, LucidePackageSearch } from 'lucide-react'
import { adjustStock, deleteInventoryItem } from '@/app/(app)/inventory/actions'

interface InventoryItem {
  id: string
  name: string
  item_type: string
  current_stock: number
  unit: string
  reorder_point: number | null
}

const categories = ['All', 'Hops', 'Grain', 'Yeast', 'Adjunct']

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <SearchFilter
      items={items}
      searchKeys={['name', 'item_type']}
      placeholder="Search inventory by name or type…"
    >
      {(filtered, query) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}{query ? ' found' : ''}
            </p>
            <ExportCSVButton
              data={filtered}
              filename="brewbrain_inventory"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'item_type', label: 'Type' },
                { key: 'current_stock', label: 'Stock' },
                { key: 'unit', label: 'Unit' },
                { key: 'reorder_point', label: 'Reorder Point' },
              ]}
              className="text-zinc-600 hover:text-white border border-white/5"
            />
          </div>

          <Tabs defaultValue="All" className="w-full">
            <TabsList className="bg-zinc-950/50 border border-white/5 p-1.5 h-auto rounded-2xl mb-6 space-x-1">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-zinc-500 font-black uppercase text-[10px] tracking-widest px-6 py-2.5 rounded-xl transition-all duration-300"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => {
              const catFiltered = category === 'All'
                ? filtered
                : filtered.filter(item => item.item_type === category)

              return (
                <TabsContent key={category} value={category} className="mt-0 focus-visible:outline-none">
                  <Card className="glass border-white/5 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6 px-8">Component Identifier</TableHead>
                          <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Classification</TableHead>
                          <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-500 py-6">Stock Status</TableHead>
                          <TableHead className="text-right text-xs font-black uppercase tracking-widest text-zinc-500 py-6 px-8">Tactical Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catFiltered.length > 0 ? catFiltered.map((item) => {
                          const isLowStock = item.current_stock <= (item.reorder_point || 0)
                          return (
                            <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                              <TableCell className="py-6 px-8">
                                <div className="flex items-center gap-3 font-black text-lg tracking-tight text-white group-hover:text-primary transition-colors">
                                  {isLowStock && <LucideAlertCircle className="h-5 w-5 text-primary animate-pulse" />}
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                  {item.item_type}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className={cn(
                                    "font-mono font-black text-xl tracking-tighter",
                                    isLowStock ? "text-primary shadow-primary/20" : "text-zinc-600"
                                  )}>
                                    {item.current_stock}
                                    <span className="text-xs font-medium text-zinc-700 ml-1.5 uppercase font-sans tracking-normal">{item.unit}</span>
                                  </span>
                                  {isLowStock && <span className="text-[9px] font-black uppercase text-primary/50 tracking-widest">Reorder Required</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-8">
                                <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
                                  <form action={adjustStock}>
                                    <input type="hidden" name="id" value={item.id} />
                                    <input type="hidden" name="adjustment" value="-1" />
                                    <Button type="submit" variant="ghost" size="icon" className="size-10 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
                                      <LucideMinus className="h-5 w-5" />
                                    </Button>
                                  </form>
                                  <form action={adjustStock}>
                                    <input type="hidden" name="id" value={item.id} />
                                    <input type="hidden" name="adjustment" value="1" />
                                    <Button type="submit" variant="ghost" size="icon" className="size-10 text-zinc-600 hover:text-green-500 hover:bg-green-500/10 border border-transparent hover:border-green-500/20">
                                      <LucidePlus className="h-5 w-5" />
                                    </Button>
                                  </form>
                                  <DeleteConfirmButton
                                    action={deleteInventoryItem}
                                    hiddenInputs={{ itemId: item.id }}
                                    itemName={item.name}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        }) : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-24 text-center">
                              <div className="max-w-xs mx-auto space-y-2">
                                <LucidePackageSearch className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-zinc-400">{query ? 'No matches' : 'Empty Silos'}</h3>
                                <p className="text-sm text-zinc-600 font-medium italic">
                                  {query ? 'Try a different search term.' : 'Define your raw material footprint using the tool above.'}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      )}
    </SearchFilter>
  )
}
