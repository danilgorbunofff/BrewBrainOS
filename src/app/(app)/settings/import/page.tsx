'use client'

import React from 'react'
import Link from 'next/link'
import { LucideArrowLeft, LucideDatabase } from 'lucide-react'
import { CardTitle } from '@/components/ui/card'
import { CSVUploader } from '@/components/CSVUploader'
import { importTanks, importInventory } from '@/app/actions/import-actions'
import { toast } from 'sonner'

export default function BulkImportPage() {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTanksUpload = async (data: any[]) => {
    const res = await importTanks(data)
    if (res.success) {
      toast.success(`Successfully minted ${res.count} tanks!`)
    } else {
      toast.error(res.error || 'Failed to import tanks')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInventoryUpload = async (data: any[]) => {
    const res = await importInventory(data)
    if (res.success) {
      toast.success(`Successfully seeded ${res.count} inventory items!`)
    } else {
      toast.error(res.error || 'Failed to import inventory')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="border-b border-border pb-10">
          <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucideDatabase className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">White-Glove Setup</h1>
              <p className="text-muted-foreground font-medium mt-1">Bulk create records via CSV files to rapidly onboard.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
               Tank Infrastructure
             </CardTitle>
             <p className="text-sm text-muted-foreground font-medium">
               Upload a CSV to instantly populate all cellar tanks.
             </p>
             <CSVUploader 
               expectedType="tanks" 
               requiredHeaders={['name', 'capacity', 'status']}
               onDataParsed={handleTanksUpload}
             />
          </div>

          <div className="space-y-4">
             <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
               Inventory Stock
             </CardTitle>
             <p className="text-sm text-muted-foreground font-medium">
               Upload a CSV to bulk populate the grain/hops/yeast vault.
             </p>
             <CSVUploader 
               expectedType="inventory" 
               requiredHeaders={['item_type', 'name', 'current_stock', 'unit', 'reorder_point']}
               onDataParsed={handleInventoryUpload}
             />
          </div>
        </div>

      </div>
    </div>
  )
}
