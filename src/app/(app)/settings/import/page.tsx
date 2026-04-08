'use client'

import React from 'react'
import Link from 'next/link'
import { LucideArrowLeft, LucideDatabase, LucideDownload } from 'lucide-react'
import { CardTitle } from '@/components/ui/card'
import { CSVUploader } from '@/components/CSVUploader'
import {
  importTanks,
  importInventory,
  importBatches,
  importSuppliers,
  importRecipes,
} from '@/app/actions/import-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// ── CSV template definitions ──────────────────────────────────────────
const TEMPLATES: Record<string, { required: string[]; optional?: string[] }> = {
  tanks: {
    required: ['name', 'capacity', 'status'],
  },
  inventory: {
    required: ['item_type', 'name', 'current_stock', 'unit'],
    optional: [
      'reorder_point', 'lot_number', 'expiration_date', 'manufacturer',
      'supplier_name', 'purchase_price', 'lead_time_days', 'min_order_quantity',
      'avg_weekly_usage', 'suppress_reorder_alerts',
      'received_date', 'storage_condition', 'degradation_tracked',
      'hsi_initial', 'hsi_current', 'grain_moisture_initial', 'grain_moisture_current',
      'ppg_initial', 'ppg_current',
    ],
  },
  batches: {
    required: ['recipe_name'],
    optional: ['status', 'og', 'fg', 'target_temp'],
  },
  suppliers: {
    required: ['name', 'country', 'supplier_type'],
    optional: [
      'contact_person', 'email', 'phone', 'address', 'city',
      'state', 'zip_code', 'website', 'specialty', 'notes',
    ],
  },
  recipes: {
    required: ['name', 'batch_size_bbls'],
    optional: ['style', 'target_og', 'target_fg', 'target_ibu', 'target_abv', 'notes'],
  },
}

function downloadTemplate(type: string) {
  const tmpl = TEMPLATES[type]
  if (!tmpl) return
  const allHeaders = [...tmpl.required, ...(tmpl.optional ?? [])]
  const csv = allHeaders.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brewbrain_${type}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBatchesUpload = async (data: any[]) => {
    const res = await importBatches(data)
    if (res.success) {
      toast.success(`Successfully imported ${res.count} batches!`)
    } else {
      toast.error(res.error || 'Failed to import batches')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuppliersUpload = async (data: any[]) => {
    const res = await importSuppliers(data)
    if (res.success) {
      toast.success(`Successfully imported ${res.count} suppliers!`)
    } else {
      toast.error(res.error || 'Failed to import suppliers')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRecipesUpload = async (data: any[]) => {
    const res = await importRecipes(data)
    if (res.success) {
      toast.success(`Successfully imported ${res.count} recipes!`)
    } else {
      toast.error(res.error || 'Failed to import recipes')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
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
              <p className="text-muted-foreground font-medium mt-1">Bulk import your brewery data via CSV files. Download a template, fill it out, and upload.</p>
            </div>
          </div>
        </div>

        {/* ── Core: Tanks & Inventory ─────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-black tracking-tight">Core Infrastructure</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ImportSection
              title="Tanks"
              description="Populate all cellar tanks — fermenters, brites, kettles."
              type="tanks"
              onUpload={handleTanksUpload}
            />
            <ImportSection
              title="Inventory"
              description="Bulk load your grain, hops, yeast, adjunct, and packaging stock."
              type="inventory"
              onUpload={handleInventoryUpload}
            />
          </div>
        </section>

        {/* ── Production: Batches & Recipes ───────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-black tracking-tight">Production</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ImportSection
              title="Batches"
              description="Import historical or in-progress batches."
              type="batches"
              onUpload={handleBatchesUpload}
            />
            <ImportSection
              title="Recipes"
              description="Import your recipe catalog with targets and sizing."
              type="recipes"
              onUpload={handleRecipesUpload}
            />
          </div>
        </section>

        {/* ── Supply Chain: Suppliers ──────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-black tracking-tight">Supply Chain</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ImportSection
              title="Suppliers"
              description="Load your supplier directory with contacts and types."
              type="suppliers"
              onUpload={handleSuppliersUpload}
            />
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Reusable import-section block ─────────────────────────────────────
function ImportSection({
  title,
  description,
  type,
  onUpload,
}: {
  title: string
  description: string
  type: 'tanks' | 'inventory' | 'batches' | 'suppliers' | 'recipes'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpload: (data: any[]) => Promise<void>
}) {
  const tmpl = TEMPLATES[type]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => downloadTemplate(type)}
        >
          <LucideDownload className="h-3.5 w-3.5" />
          Template
        </Button>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{description}</p>
      <CSVUploader
        expectedType={type}
        requiredHeaders={tmpl.required}
        optionalHeaders={tmpl.optional}
        onDataParsed={onUpload}
      />
    </div>
  )
}
